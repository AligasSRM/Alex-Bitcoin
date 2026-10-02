import type { CoreHealthSnapshot } from "../core/health";
import { evaluateReadiness, type ReadinessResult } from "./readiness";

export interface RuntimeStatus {
  readiness: ReadinessResult;
  observedAt: string;
}

export function buildRuntimeStatus(snapshot: CoreHealthSnapshot): RuntimeStatus {
  return {
    readiness: evaluateReadiness(snapshot),
    observedAt: snapshot.collectedAt,
  };
}
