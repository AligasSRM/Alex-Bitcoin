import type { MinerTelemetry } from "./types";

export interface MinerAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getTelemetry(): Promise<MinerTelemetry>;
}
