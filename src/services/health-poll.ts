import type { CoreDependencies } from "../core/application";
import { collectCoreHealthSnapshot, type CoreHealthSnapshot } from "../core/health";
import { withRetry, type RetryOptions } from "./retry";

export interface HealthPollOptions extends RetryOptions {
  intervalMs: number;
}

export interface HealthPoller {
  poll(): Promise<CoreHealthSnapshot>;
  start(onSnapshot: (snapshot: CoreHealthSnapshot) => void, onError?: (error: unknown) => void): void;
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
  let running = false;
  let timer: ReturnType<typeof setInterval> | undefined;

  const poll = async (): Promise<CoreHealthSnapshot> => {
    if (stopped) throw new Error("Health poller is stopped");
    return withRetry(() => collectCoreHealthSnapshot(deps), options);
  };

  return {
    poll,

    start(onSnapshot, onError = () => undefined) {
      if (stopped) throw new Error("Health poller is stopped");
      if (timer) return;

      const run = async () => {
        if (running || stopped) return;
        running = true;
        try {
          onSnapshot(await poll());
        } catch (error) {
          onError(error);
        } finally {
          running = false;
        }
      };

      void run();
      if (intervalMs > 0) {
        timer = setInterval(() => void run(), intervalMs);
      }
    },

    stop() {
      stopped = true;
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
    },
  };
}
