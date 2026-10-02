import type { CoreHealthSnapshot } from "../core/health";

export type ReadinessState = "ready" | "degraded" | "unavailable";

export interface ReadinessResult {
  state: ReadinessState;
  ready: boolean;
  reasons: string[];
}

export function evaluateReadiness(snapshot: CoreHealthSnapshot): ReadinessResult {
  const reasons: string[] = [];

  if (!snapshot.miner) reasons.push("miner_unavailable");
  if (!snapshot.pool) reasons.push("pool_unavailable");
  if (!snapshot.wallet) reasons.push("wallet_unavailable");
  if (!snapshot.profitability) reasons.push("profitability_unavailable");

  if (reasons.length === 0) {
    return { state: "ready", ready: true, reasons };
  }

  const coreUnavailable = !snapshot.miner || !snapshot.pool;
  return {
    state: coreUnavailable ? "unavailable" : "degraded",
    ready: false,
    reasons,
  };
}
