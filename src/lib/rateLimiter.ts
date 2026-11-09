/**
 * In-Memory Sliding Window Rate Limiter for SorakSora!
 * Protects against spam bots and flood submissions.
 */

interface VisitorRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, VisitorRecord>();

export interface RateLimitResult {
  allowed: boolean;
  remainingSeconds: number;
  formattedWaitTime: string;
}

/**
 * Checks whether an incoming submission is permitted under rate limiting policy.
 *
 * @param identifier Unique visitor identifier (e.g. vid:uuid or ip:address)
 * @param maxSubmissions Allowed number of submissions in the window (e.g. 3)
 * @param windowMinutes Time window in minutes (e.g. 5)
 */
export function checkRateLimit(
  identifier: string,
  maxSubmissions: number,
  windowMinutes: number
): RateLimitResult {
  const now = Date.now();
  const windowMs = Math.max(1, windowMinutes) * 60 * 1000;
  const cutoff = now - windowMs;

  const record = rateLimitStore.get(identifier) || { timestamps: [] };
  // Prune expired timestamps
  const recent = record.timestamps.filter((t) => t > cutoff);

  if (recent.length >= maxSubmissions) {
    // Oldest submission in active window
    const oldest = recent[0];
    const remainingMs = Math.max(0, oldest + windowMs - now);
    const remainingSeconds = Math.max(1, Math.ceil(remainingMs / 1000));

    let formattedWaitTime = `${remainingSeconds} detik`;
    if (remainingSeconds >= 60) {
      const minutes = Math.ceil(remainingSeconds / 60);
      formattedWaitTime = `${minutes} menit`;
    }

    return {
      allowed: false,
      remainingSeconds,
      formattedWaitTime,
    };
  }

  // Record this valid submission timestamp
  recent.push(now);
  rateLimitStore.set(identifier, { timestamps: recent });

  return {
    allowed: true,
    remainingSeconds: 0,
    formattedWaitTime: "",
  };
}

/**
 * Clears the in-memory rate limit store (useful for automated testing / admin resets).
 */
export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}
