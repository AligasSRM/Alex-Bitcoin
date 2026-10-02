export type ErrorCode =
  | "CONFIGURATION_ERROR"
  | "VALIDATION_ERROR"
  | "EXTERNAL_SERVICE_ERROR"
  | "UNAVAILABLE";

export class CoreError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "CoreError";
  }
}
