export interface RetryOptions {
  attempts: number;
  delayMs: number;
  maxDelayMs: number;
}

const DEFAULTS: RetryOptions = { attempts: 2, delayMs: 250, maxDelayMs: 2_000 };

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const attempts = options.attempts ?? DEFAULTS.attempts;
  const delayMs = options.delayMs ?? DEFAULTS.delayMs;
  const maxDelayMs = options.maxDelayMs ?? DEFAULTS.maxDelayMs;

  if (!Number.isInteger(attempts) || attempts < 1) throw new Error("attempts must be a positive integer");
  if (!Number.isFinite(delayMs) || delayMs < 0) throw new Error("delayMs must be non-negative");
  if (!Number.isFinite(maxDelayMs) || maxDelayMs < 0) throw new Error("maxDelayMs must be non-negative");

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        const backoff = Math.min(delayMs * 2 ** (attempt - 1), maxDelayMs);
        if (backoff > 0) {
          await new Promise<void>((resolve) => setTimeout(resolve, backoff));
        }
      }
    }
  }

  throw lastError;
}
