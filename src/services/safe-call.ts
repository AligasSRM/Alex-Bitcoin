export interface SafeCallOptions {
  timeoutMs: number;
}

export interface ServiceFailure {
  ok: false;
  code: "UNAVAILABLE" | "TIMEOUT";
}

export interface ServiceSuccess<T> {
  ok: true;
  value: T;
}

export type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;

const DEFAULT_TIMEOUT_MS = 10_000;

export async function safeCall<T>(
  operation: () => Promise<T>,
  options: Partial<SafeCallOptions> = {},
): Promise<ServiceResult<T>> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
    throw new Error("timeoutMs must be non-negative");
  }

  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("SERVICE_CALL_TIMEOUT")), timeoutMs);
    });

    return { ok: true, value: await Promise.race([operation(), timeout]) };
  } catch (error) {
    return {
      ok: false,
      code: error instanceof Error && error.message === "SERVICE_CALL_TIMEOUT"
        ? "TIMEOUT"
        : "UNAVAILABLE",
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
