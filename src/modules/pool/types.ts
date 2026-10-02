import { assertNonEmpty, assertNonNegativeFinite, assertPositiveFinite } from "../../core/validation";

export type PoolConnectionState = "disconnected" | "connecting" | "connected" | "degraded";

export interface PoolTelemetry {
  poolId: string;
  endpoint: string;
  connection: PoolConnectionState;
  reportedHashrateHps: number;
  acceptedShares: number;
  rejectedShares: number;
  observedAt: string;
}

export function validatePoolTelemetry(value: PoolTelemetry): void {
  assertNonEmpty(value.poolId, "poolId");
  assertNonEmpty(value.endpoint, "endpoint");
  assertPositiveFinite(value.reportedHashrateHps, "reportedHashrateHps");
  assertNonNegativeFinite(value.acceptedShares, "acceptedShares");
  assertNonNegativeFinite(value.rejectedShares, "rejectedShares");

  if (!["disconnected", "connecting", "connected", "degraded"].includes(value.connection)) {
    throw new Error("Invalid pool connection state");
  }

  if (Number.isNaN(Date.parse(value.observedAt))) {
    throw new Error("observedAt must be a valid ISO timestamp");
  }
}
