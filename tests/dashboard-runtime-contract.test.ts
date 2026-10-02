import { formatMetric, normalizeRuntimeSnapshot } from "../src/dashboard/runtime-contract";

const empty = normalizeRuntimeSnapshot(undefined);
if (empty.state !== "offline") throw new Error("default runtime state failed");
if (empty.miner.hashrate !== null) throw new Error("missing hashrate must remain N/A");
if (empty.pool.connected) throw new Error("missing pool must remain disconnected");
if (empty.asic.boardCount !== null || empty.network.latencyMs !== null) throw new Error("missing telemetry must remain N/A");
if (empty.financial.verified) throw new Error("unverified financial data must remain disabled");

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
  wallet: { configured: true, address: "bc1example" },
  asic: { boardCount: 3, chipCount: 300, frequencyMHz: 600, hardwareErrors: 0, fanRpm: 4200, status: "online" },
  network: { internetConnected: true, latencyMs: 42, reconnects: 1, lastError: null },
  events: [{ at: "2026-10-02T20:00:03.000Z", severity: "info", source: "stratum", message: "job received" }],
  financial: { btcEarned: 0.001, electricityCost: 2.5, profitLoss: -1.2, verified: true },
});

if (live.state !== "mining" || live.miner.hashrate !== 125.5) throw new Error("live runtime normalization failed");
if (live.pool.protocol !== "stratum-v1" || live.shares.accepted !== 9) throw new Error("runtime nested data failed");
if (live.asic.boardCount !== 3 || live.network.latencyMs !== 42 || live.events.length !== 1) throw new Error("operator telemetry normalization failed");
if (!live.financial.verified || live.financial.profitLoss !== -1.2) throw new Error("verified finance normalization failed");
if (normalizeRuntimeSnapshot({ state: "invented" as any }).state !== "offline") throw new Error("invalid state must fail closed");
if (formatMetric(null) !== "N/A" || formatMetric(42, " W") !== "42 W") throw new Error("metric formatting failed");

console.log("dashboard runtime contract tests passed");
