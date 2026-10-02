import type { CoreDependencies } from "../core/application";
import { collectCoreHealthSnapshot, type CoreHealthSnapshot } from "../core/health";
import { withRetry, type RetryOptions } from "./retry";

export interface HealthPollOptions extends RetryOptions {
  intervalMs: number;
}

export interface HealthPoller {
  poll(): Promise<CoreHealthSnapshot>;
  stop(): void;
}

const DEFAULT_INTERVAL_MS = 30_000;

export function createHealthPoller(
  deps: CoreDependencies,
  options: Partial<HealthPollOptions> = {},
): HealthPoller {
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  if (!Number.isFinite(intervalMs) || intervalMs < 0) {
    throw new Error("intervalMs must be non-negative");
  }

  let stopped = false;

  return {
    async poll() {
      if (stopped) throw new Error("Health poller is stopped");
      return withRetry(() => collectCoreHealthSnapshot(deps), options);
    },
    stop() {
      stopped = true;
    },
  };
}
