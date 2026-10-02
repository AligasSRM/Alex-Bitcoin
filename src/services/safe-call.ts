export interface ServiceFailure {
  ok: false;
  code: "UNAVAILABLE";
}

export interface ServiceSuccess<T> {
  ok: true;
  value: T;
}

export type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;

export async function safeCall<T>(operation: () => Promise<T>): Promise<ServiceResult<T>> {
  try {
    return { ok: true, value: await operation() };
  } catch {
    return { ok: false, code: "UNAVAILABLE" };
  }
}
