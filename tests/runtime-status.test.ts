import { buildRuntimeStatus } from "../src/services/runtime-status";

const snapshot = {
  collectedAt: "2026-10-02T00:00:00.000Z",
  miner: {} as any,
  pool: {} as any,
  wallet: {} as any,
  profitability: {} as any,
  alerts: [],
};

const status = buildRuntimeStatus(snapshot);
if (!status.readiness.ready || status.readiness.state !== "ready") {
  throw new Error("runtime status readiness failed");
}
if (status.observedAt !== snapshot.collectedAt) {
  throw new Error("runtime status timestamp failed");
}

const degraded = buildRuntimeStatus({ ...snapshot, wallet: null });
if (degraded.readiness.ready || degraded.readiness.state !== "degraded") {
  throw new Error("runtime degraded status failed");
}

console.log("runtime status tests passed");
