import { formatMetric, normalizeRuntimeSnapshot } from "../src/dashboard/runtime-contract";

const empty = normalizeRuntimeSnapshot(undefined);
if (empty.state !== "offline") throw new Error("default runtime state failed");
if (empty.miner.hashrate !== null) throw new Error("missing hashrate must remain N/A");
if (empty.pool.connected) throw new Error("missing pool must remain disconnected");

const live = normalizeRuntimeSnapshot({
  observedAt: "2026-10-02T20:00:00.000Z",
  state: "mining",
  miner: {
    connected: true,
    hashrate: 125.5,
    temperatureC: 61,
    powerW: 3200,
    efficiencyJPerTH: 25.5,
    uptimeSeconds: 120,
  },
  pool: {
    connected: true,
    host: "pool.example",
    port: 3333,
    protocol: "stratum-v1",
    authorized: true,
    difficulty: 1024,
    shareTargetHex: "00ff",
    currentJobId: "job-1",
    lastResponseAt: "2026-10-02T20:00:01.000Z",
  },
  shares: {
    submitted: 10,
    accepted: 9,
    rejected: 1,
    stale: 0,
    lastShareAt: "2026-10-02T20:00:02.000Z",
    bestShareDifficulty: 2048,
  },
  wallet: {
    configured: true,
    address: "bc1example",
  },
});

if (live.state !== "mining" || live.miner.hashrate !== 125.5) throw new Error("live runtime normalization failed");
if (live.pool.protocol !== "stratum-v1" || live.shares.accepted !== 9) throw new Error("runtime nested data failed");
if (normalizeRuntimeSnapshot({ state: "invented" as any }).state !== "offline") throw new Error("invalid state must fail closed");
if (formatMetric(null) !== "N/A" || formatMetric(42, " W") !== "42 W") throw new Error("metric formatting failed");

console.log("dashboard runtime contract tests passed");
