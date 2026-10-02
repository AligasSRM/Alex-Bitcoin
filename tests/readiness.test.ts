import { evaluateReadiness } from "../src/services/readiness";

const base = {
  collectedAt: new Date().toISOString(),
  miner: {} as any,
  pool: {} as any,
  wallet: {} as any,
  profitability: {} as any,
  alerts: [],
};

const ready = evaluateReadiness(base);
if (ready.state !== "ready" || !ready.ready || ready.reasons.length !== 0) {
  throw new Error("ready state failed");
}

const degraded = evaluateReadiness({ ...base, profitability: null });
if (degraded.state !== "degraded" || degraded.ready || !degraded.reasons.includes("profitability_unavailable")) {
  throw new Error("degraded state failed");
}

const unavailable = evaluateReadiness({ ...base, miner: null });
if (unavailable.state !== "unavailable" || unavailable.ready || !unavailable.reasons.includes("miner_unavailable")) {
  throw new Error("unavailable state failed");
}

console.log("readiness tests passed");
