import type { MinerTelemetry } from "./types";
import type { MinerAdapter } from "./adapter";

export interface AsicMinerRuntime extends MinerAdapter {
  readonly kind: "asic";
  readonly endpoint: string;
  startMining(): Promise<void>;
  stopMining(): Promise<void>;
  getTelemetry(): Promise<MinerTelemetry>;
}

export function assertAsicMinerRuntime(value: AsicMinerRuntime): void {
  if (value.kind !== "asic") throw new Error("Invalid ASIC miner runtime kind");
  if (!value.endpoint.trim()) throw new Error("ASIC miner endpoint must be non-empty");
  if (typeof value.startMining !== "function" || typeof value.stopMining !== "function") {
    throw new Error("ASIC miner control boundary is incomplete");
  }
}
