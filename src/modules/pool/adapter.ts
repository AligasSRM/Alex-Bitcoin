import type { PoolTelemetry } from "./types";

export interface PoolAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getTelemetry(): Promise<PoolTelemetry>;
}
