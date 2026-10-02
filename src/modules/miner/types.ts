import { assertNonEmpty, assertNonNegativeFinite, assertPositiveFinite } from "../../core/validation";

export type MinerConnectionState = "disconnected" | "connecting" | "connected" | "degraded";

export interface MinerTelemetry {
  minerId: string;
  model: string;
  firmware?: string;
  connection: MinerConnectionState;
  hashrateHps: number;
  temperatureC: number;
  powerWatts: number;
  acceptedShares: number;
  rejectedShares: number;
  observedAt: string;
}

export function validateMinerTelemetry(value: MinerTelemetry): void {
  assertNonEmpty(value.minerId, "minerId");
  assertNonEmpty(value.model, "model");
  assertPositiveFinite(value.hashrateHps, "hashrateHps");
  assertNonNegativeFinite(value.temperatureC, "temperatureC");
  assertNonNegativeFinite(value.powerWatts, "powerWatts");
  assertNonNegativeFinite(value.acceptedShares, "acceptedShares");
  assertNonNegativeFinite(value.rejectedShares, "rejectedShares");

  if (!["disconnected", "connecting", "connected", "degraded"].includes(value.connection)) {
    throw new Error("Invalid miner connection state");
  }

  if (Number.isNaN(Date.parse(value.observedAt))) {
    throw new Error("observedAt must be a valid ISO timestamp");
  }
}
