import { EventEmitter } from "events";

export interface Message {
  role: "system" | "user" | "assistant" | "function";
  content: string | null;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}

export interface FunctionDefinition {
  name: string;
  description?: string;
  parameters: Record<string, unknown>;
}

export interface LLMRequestOptions {
  model: string;
  messages: Message[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  functions?: FunctionDefinition[];
  function_call?: "none" | "auto" | { name: string };
  stop?: string | string[];
  presence_penalty?: number;
  frequency_penalty?: number;
  user?: string;
  n?: number;
  logit_bias?: Record<string, number>;
}

export interface LLMUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface LLMChoice {
  index: number;
  message: Message;
  finish_reason: "stop" | "length" | "function_call" | "content_filter" | null;
}

export interface LLMResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: LLMChoice[];
  usage: LLMUsage;
}

export interface StreamDelta {
  role?: "assistant" | "function";
  content?: string | null;
  function_call?: {
    name?: string;
    arguments?: string;
  };
}

export interface StreamChoice {
  index: number;
  delta: StreamDelta;
  finish_reason: "stop" | "length" | "function_call" | "content_filter" | null;
}

export interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: StreamChoice[];
}

export class LLMError extends Error {
  public readonly statusCode?: number;
  public readonly code?: string;
  public readonly type?: string;
  public readonly raw?: unknown;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      code?: string;
      type?: string;
      raw?: unknown;
    },
  ) {
    super(message);
    this.name = "LLMError";
    this.statusCode = options?.statusCode;
    this.code = options?.code;
    this.type = options?.type;
    this.raw = options?.raw;
    Object.setPrototypeOf(this, LLMError.prototype);
  }
}

export class LLMStream extends EventEmitter {
  private _content = "";
  private _functionCallName = "";
  private _functionCallArguments = "";
  private _finished = false;
  private _finishReason: string | null = null;

  get content(): string {
    return this._content;
  }

  get functionCallName(): string {
    return this._functionCallName;
  }

  get functionCallArguments(): string {
    return this._functionCallArguments;
  }

  get finished(): boolean {
    return this._finished;
  }

  get finishReason(): string | null {
    return this._finishReason;
  }

  _handleChunk(chunk: StreamChunk): void {
    for (const choice of chunk.choices) {
      const delta = choice.delta;

      if (delta.content != null) {
        this._content += delta.content;
        this.emit("content", delta.content, this._content);
        this.emit("data", delta.content);
      }

      if (delta.function_call) {
        if (delta.function_call.name) {
          this._functionCallName += delta.function_call.name;
        }
        if (delta.function_call.arguments) {
          this._functionCallArguments += delta.function_call.arguments;
        }
        this.emit("function_call_delta", delta.function_call);
      }

      if (choice.finish_reason) {
        this._finishReason = choice.finish_reason;
      }
    }
  }

  _finish(): void {
    this._finished = true;
    if (this._functionCallName) {
      this.emit("function_call", {
        name: this._functionCallName,
        arguments: this._functionCallArguments,
      });
    }
    this.emit("end", {
      content: this._content,
      functionCall: this._functionCallName
        ? {
            name: this._functionCallName,
            arguments: this._functionCallArguments,
          }
        : null,
      finishReason: this._finishReason,
    });
  }

  _error(err: LLMError): void {
    this.emit("error", err);
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<string> {
    const chunks: string[] = [];
    let resolve: (() => void) | null = null;
    let finished = false;
    let error: LLMError | null = null;

    const onData = (chunk: string) => {
      chunks.push(chunk);
      if (resolve) {
        const r = resolve;
        resolve = null;
        r();
      }
    };

    const onEnd = () => {
      finished = true;
      if (resolve) {
        const r = resolve;
        resolve = null;
        r();
      }
    };

    const onError = (err: LLMError) => {
      error = err;
      finished = true;
      if (resolve) {
        const r = resolve;
        resolve = null;
        r();
      }
    };

    this.on("data", onData);
    this.on("end", onEnd);
    this.on("error", onError);

    try {
      while (!finished || chunks.length > 0) {
        if (chunks.length > 0) {
          yield chunks.shift()!;
        } else if (!finished) {
          await new Promise<void>((r) => {
            resolve = r;
          });
        }
      }
    } finally {
      this.off("data", onData);
      this.off("end", onEnd);
      this.off("error", onError);
    }

    if (error) {
      throw error;
    }
  }
}

export interface LLMClientConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

const DEFAULT_BASE_URL = "https://nexus.api.gateway/v1";
const DEFAULT_TIMEOUT = 60_000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatusCode(statusCode: number): boolean {
  return (
    statusCode === 429 ||
    statusCode === 502 ||
    statusCode === 503 ||
    statusCode === 504
  );
}

export class LLMClient {
  private readonly config: Required<LLMClientConfig>;

  constructor(config: LLMClientConfig = {}) {
    this.config = {
      apiKey: config.apiKey ?? process.env.NEXUS_API_KEY ?? "",
      baseUrl: config.baseUrl ?? process.env.NEXUS_BASE_URL ?? DEFAULT_BASE_URL,
      defaultModel:
        config.defaultModel ?? process.env.NEXUS_DEFAULT_MODEL ?? "gpt-4o",
      defaultTemperature: config.defaultTemperature ?? 0.7,
      defaultMaxTokens: config.defaultMaxTokens ?? 2048,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
      retryDelay: config.retryDelay ?? DEFAULT_RETRY_DELAY,
      headers: config.headers ?? {},
    };
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...this.config.headers,
    };

    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  private buildRequestBody(
    options: LLMRequestOptions,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: options.model ?? this.config.defaultModel,
      messages: options.messages,
    };

    if (options.temperature !== undefined)
      body.temperature = options.temperature;
    else body.temperature = this.config.defaultTemperature;

    if (options.max_tokens !== undefined) body.max_tokens = options.max_tokens;
    else body.max_tokens = this.config.defaultMaxTokens;

    if (options.top_p !== undefined) body.top_p = options.top_p;
    if (options.stream !== undefined) body.stream = options.stream;
    if (options.functions !== undefined) body.functions = options.functions;
    if (options.function_call !== undefined)
      body.function_call = options.function_call;
    if (options.stop !== undefined) body.stop = options.stop;
    if (options.presence_penalty !== undefined)
      body.presence_penalty = options.presence_penalty;
    if (options.frequency_penalty !== undefined)
      body.frequency_penalty = options.frequency_penalty;
    if (options.user !== undefined) body.user = options.user;
    if (options.n !== undefined) body.n = options.n;
    if (options.logit_bias !== undefined) body.logit_bias = options.logit_bias;

    return body;
  }

  private async parseErrorResponse(response: Response): Promise<LLMError> {
    let raw: unknown;
    let message = `HTTP ${response.status}: ${response.statusText}`;

    try {
      raw = await response.json();
      if (
        raw &&
        typeof raw === "object" &&
        "error" in raw &&
        raw.error &&
        typeof raw.error === "object"
      ) {
        const err = raw.error as Record<string, unknown>;
        if (typeof err.message === "string") message = err.message;
        return new LLMError(message, {
          statusCode: response.status,
          code: typeof err.code === "string" ? err.code : undefined,
          type: typeof err.type === "string" ? err.type : undefined,
          raw,
        });
      }
    } catch {
      // ignore JSON parse errors
    }

    return new LLMError(message, {
      statusCode: response.status,
      raw,
    });
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      return response;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new LLMError(`Request timed out after ${this.config.timeout}ms`, {
          code: "TIMEOUT",
        });
      }
      throw new LLMError(
        err instanceof Error ? err.message : "Network request failed",
        { code: "NETWORK_ERROR", raw: err },
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async complete(options: LLMRequestOptions): Promise<LLMResponse> {
    const url = `${this.config.baseUrl}/chat/completions`;
    const body = this.buildRequestBody({ ...options, stream: false });
    const headers = this.buildHeaders();

    let lastError: LLMError | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      if (attempt > 0) {
        await sleep(this.config.retryDelay * attempt);
      }

      let response: Response;
      try {
        response = await this.fetchWithTimeout(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
      } catch (err) {
        lastError = err instanceof LLMError ? err : new LLMError(String(err));
        if (
          lastError.code === "TIMEOUT" ||
          lastError.code === "NETWORK_ERROR"
        ) {
          continue;
        }
        throw lastError;
      }

      if (!response.ok) {
        const error = await this.parseErrorResponse(response);
        if (isRetryableStatusCode(response.status)) {
          lastError = error;
          continue;
        }
        throw error;
      }

      let data: unknown;
      try {
        data = await response.json();
      } catch (err) {
        throw new LLMError("Failed to parse response JSON", {
          code: "PARSE_ERROR",
          raw: err,
        });
      }

      return data as LLMResponse;
    }

    throw lastError ?? new LLMError("Max retries exceeded");
  }

  stream(options: LLMRequestOptions): LLMStream {
    const url = `${this.config.baseUrl}/chat/completions`;
    const body = this.buildRequestBody({ ...options, stream: true });
    const headers = this.buildHeaders();
    const llmStream = new LLMStream();

    this.executeStream(url, headers, body, llmStream).catch((err) => {
      const llmError =
        err instanceof LLMError
          ? err
          : new LLMError(err instanceof Error ? err.message : String(err), {
              raw: err,
            });
      llmStream._error(llmError);
    });

    return llmStream;
  }

  private async executeStream(
    url: string,
    headers: Record<string, string>,
    body: Record<string, unknown>,
    llmStream: LLMStream,
  ): Promise<void> {
    let lastError: LLMError | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      if (attempt > 0) {
        await sleep(this.config.retryDelay * attempt);
      }

      let response: Response;
      try {
        response = await this.fetchWithTimeout(url, {
          method: "POST",
          headers: { ...headers, Accept: "text/event-stream" },
          body: JSON.stringify(body),
        });
      } catch (err) {
        lastError = err instanceof LLMError ? err : new LLMError(String(err));
        if (
          lastError.code === "TIMEOUT" ||
          lastError.code === "NETWORK_ERROR"
        ) {
          continue;
        }
        throw lastError;
      }

      if (!response.ok) {
        const error = await this.parseErrorResponse(response);
        if (isRetryableStatusCode(response.status)) {
          lastError = error;
          continue;
        }
        throw error;
      }

      if (!response.body) {
        throw new LLMError("Response body is null", { code: "NO_BODY" });
      }

      await this.processSSEStream(response.body, llmStream);
      return;
    }

    throw lastError ?? new LLMError("Max retries exceeded");
  }

  private async processSSEStream(
    body: ReadableStream<Uint8Array>,
    llmStream: LLMStream,
  ): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();

          if (trimmed === "" || trimmed.startsWith(":")) {
            continue;
          }

          if (trimmed.startsWith("data:")) {
            const data = trimmed.slice(5).trim();

            if (data === "[DONE]") {
              llmStream._finish();
              return;
            }

            try {
              const chunk = JSON.parse(data) as StreamChunk;
              llmStream._handleChunk(chunk);
            } catch {
              // skip malformed chunks
            }
          }
        }
      }

      // Process any remaining buffer content
      if (buffer.trim()) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith("data:")) {
          const data = trimmed.slice(5).trim();
          if (data !== "[DONE]") {
            try {
              const chunk = JSON.parse(data) as StreamChunk;
              llmStream._handleChunk(chunk);
            } catch {
              // skip malformed chunks
            }
          }
        }
      }

      llmStream._finish();
    } finally {
      reader.releaseLock();
    }
  }

  async streamToString(options: LLMRequestOptions): Promise<string> {
    const llmStream = this.stream(options);

    return new Promise<string>((resolve, reject) => {
      llmStream.on("end", ({ content }: { content: string }) => {
        resolve(content);
      });
      llmStream.on("error", (err: LLMError) => {
        reject(err);
      });
    });
  }

  async *streamIterator(
    options: LLMRequestOptions,
  ): AsyncGenerator<string, void, unknown> {
    const llmStream = this.stream(options);
    yield* llmStream;
  }

  async chat(
    messages: Message[],
    overrides: Partial<LLMRequestOptions> = {},
  ): Promise<string> {
    const response = await this.complete({
      model: this.config.defaultModel,
      messages,
      ...overrides,
    });

    const choice = response.choices[0];
    if (!choice) {
      throw new LLMError("No choices returned in response");
    }

    return choice.message.content ?? "";
  }

  async chatStream(
    messages: Message[],
    overrides: Partial<LLMRequestOptions> = {},
  ): Promise<LLMStream> {
    return this.stream({
      model: this.config.defaultModel,
      messages,
      ...overrides,
    });
  }
}

export function createLLMClient(config: LLMClientConfig = {}): LLMClient {
  return new LLMClient(config);
}

export const defaultClient = new LLMClient();

export default LLMClient;
