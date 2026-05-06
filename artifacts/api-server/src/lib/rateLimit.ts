/**
 * Shared retry + rate-limiting utilities for integration adapters.
 */

import { logger } from "./logger";

/** Exponential back-off retry. Throws on final failure. */
export async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseMs = 1_000,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts) break;
      const delay = baseMs * 2 ** (attempt - 1) + Math.random() * 500;
      logger.warn(
        { err, attempt, label },
        `${label}: attempt ${attempt} failed, retrying in ${Math.round(delay)}ms`,
      );
      await sleep(delay);
    }
  }
  throw lastErr;
}

/** Sliding-window rate limiter. */
export class RateLimiter {
  private timestamps: number[] = [];
  constructor(
    private readonly calls: number,
    private readonly periodMs: number,
  ) {}

  async throttle(): Promise<void> {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(
      (t) => now - t < this.periodMs,
    );
    if (this.timestamps.length >= this.calls) {
      const wait = this.periodMs - (now - this.timestamps[0]!);
      if (wait > 0) await sleep(wait);
    }
    this.timestamps.push(Date.now());
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Simple paginator: calls `fetcher(page)` until it returns < pageSize results. */
export async function paginate<T>(
  fetcher: (page: number) => Promise<T[]>,
  pageSize = 100,
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  while (true) {
    const batch = await fetcher(page);
    all.push(...batch);
    if (batch.length < pageSize) break;
    page++;
  }
  return all;
}
