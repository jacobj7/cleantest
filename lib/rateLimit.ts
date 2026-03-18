import Redis from "ioredis";
import Anthropic from "@anthropic-ai/sdk";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

const anthropic = new Anthropic();

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalRequests: number;
}

async function checkRateLimit(
  userId: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const key = `rate_limit:${userId}`;

  const pipeline = redis.pipeline();

  // Remove expired entries outside the window
  pipeline.zremrangebyscore(key, "-inf", windowStart);

  // Add current request timestamp
  pipeline.zadd(key, now, `${now}-${Math.random()}`);

  // Count requests in the current window
  pipeline.zcard(key);

  // Set expiry on the key
  pipeline.pexpire(key, config.windowMs);

  const results = await pipeline.exec();

  if (!results) {
    throw new Error("Redis pipeline execution failed");
  }

  const requestCount = results[2][1] as number;
  const allowed = requestCount <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - requestCount);
  const resetTime = now + config.windowMs;

  // If over limit, remove the request we just added
  if (!allowed) {
    await redis.zremrangebyscore(key, now, now);
  }

  return {
    allowed,
    remaining: allowed ? remaining : 0,
    resetTime,
    totalRequests: requestCount,
  };
}

async function makeRateLimitedRequest(
  userId: string,
  message: string,
  config: RateLimitConfig,
): Promise<string> {
  const rateLimitResult = await checkRateLimit(userId, config);

  if (!rateLimitResult.allowed) {
    const resetDate = new Date(rateLimitResult.resetTime);
    throw new Error(
      `Rate limit exceeded for user ${userId}. ` +
        `Limit: ${config.maxRequests} requests per ${config.windowMs / 1000}s window. ` +
        `Reset at: ${resetDate.toISOString()}`,
    );
  }

  console.log(
    `Rate limit check passed for user ${userId}: ` +
      `${rateLimitResult.remaining} requests remaining in window`,
  );

  const response = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: message,
      },
    ],
  });

  const textContent = response.content.find((block) => block.type === "text");
  return textContent ? textContent.text : "";
}

async function demonstrateRateLimiter() {
  const config: RateLimitConfig = {
    windowMs: 60000, // 1 minute window
    maxRequests: 5, // Max 5 requests per minute
  };

  const userId = "user_123";
  const messages = [
    "What is the capital of France?",
    "What is 2 + 2?",
    "Tell me a short joke",
    "What color is the sky?",
    "What is the speed of light?",
    "This should be rate limited",
    "This should also be rate limited",
  ];

  console.log(
    `Starting rate limiter demo with config: ${config.maxRequests} requests per ${config.windowMs / 1000}s`,
  );
  console.log("=".repeat(60));

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    console.log(`\nRequest ${i + 1}: "${message}"`);

    try {
      const response = await makeRateLimitedRequest(userId, message, config);
      console.log(`Response: ${response.substring(0, 100)}...`);
    } catch (error) {
      if (error instanceof Error) {
        console.log(`Error: ${error.message}`);
      }
    }

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log("\n" + "=".repeat(60));
  console.log("Demo completed");

  // Check current rate limit status
  const status = await checkRateLimit(userId, config);
  console.log(`\nFinal rate limit status for ${userId}:`);
  console.log(`- Total requests in window: ${status.totalRequests}`);
  console.log(`- Remaining requests: ${status.remaining}`);
  console.log(
    `- Window resets at: ${new Date(status.resetTime).toISOString()}`,
  );
}

// Export functions for use as a module
export {
  checkRateLimit,
  makeRateLimitedRequest,
  RateLimitConfig,
  RateLimitResult,
};

// Run demonstration if this is the main module
demonstrateRateLimiter()
  .then(() => {
    redis.disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    redis.disconnect();
    process.exit(1);
  });
