const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 10;

export function rateLimit(identifier: string): {
  success: boolean;
  remaining: number;
  reset: number;
} {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetTime) {
    const resetTime = now + WINDOW_MS;
    rateLimitMap.set(identifier, { count: 1, resetTime });
    return { success: true, remaining: MAX_REQUESTS - 1, reset: resetTime };
  }

  if (entry.count >= MAX_REQUESTS) {
    return { success: false, remaining: 0, reset: entry.resetTime };
  }

  entry.count++;
  return { success: true, remaining: MAX_REQUESTS - entry.count, reset: entry.resetTime };
}
