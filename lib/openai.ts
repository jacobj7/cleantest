import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface CreateOptions {
  model: string;
  messages: Array<{ role: string; content: string }>;
  max_tokens?: number;
  temperature?: number;
  response_format?: { type: string };
}

export const openai = {
  chat: {
    completions: {
      create: async (opts: CreateOptions) => {
        const systemMsgs = opts.messages.filter((m) => m.role === "system");
        const userMsgs = opts.messages.filter((m) => m.role !== "system");
        const systemPrompt = systemMsgs.map((m) => m.content).join("\n") || undefined;

        const wantsJson = opts.response_format?.type === "json_object";
        const systemWithJson = wantsJson
          ? (systemPrompt ? systemPrompt + "\n\nRespond with ONLY valid JSON." : "Respond with ONLY valid JSON.")
          : systemPrompt;

        const response = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: opts.max_tokens ?? 1024,
          ...(systemWithJson ? { system: systemWithJson } : {}),
          messages: userMsgs.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        });
        const content = response.content[0];
        return {
          choices: [
            {
              message: {
                role: "assistant",
                content: content.type === "text" ? content.text : "",
              },
            },
          ],
        };
      },
    },
  },
};
