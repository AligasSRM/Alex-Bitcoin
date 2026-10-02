export interface ProductionActivationInput {
  env: "development" | "test" | "production";
  minerConfigured: boolean;
  minerConnected: boolean;
  poolConfigured: boolean;
  poolConnected: boolean;
  walletConfigured: boolean;
  walletReachable: boolean;
  realMiningEvidence?: RealMiningEvidence;
}

export interface RealMiningEvidence {
  asicIdentityVerified: boolean;
  stratumSubscribed: boolean;
  stratumAuthorized: boolean;
  realJobReceived: boolean;
  realShareSubmitted: boolean;
  poolAcceptedShare: boolean;
  telemetryVerified: boolean;
}

export interface ProductionActivationResult {
  enabled: boolean;
  reasons: string[];
}

const REQUIRED_REAL_EVIDENCE: Array<keyof RealMiningEvidence> = [
  "asicIdentityVerified",
  "stratumSubscribed",
  "stratumAuthorized",
  "realJobReceived",
  "realShareSubmitted",
  "poolAcceptedShare",
  "telemetryVerified",
];

export function evaluateProductionActivation(
  input: ProductionActivationInput,
): ProductionActivationResult {
  const reasons: string[] = [];

  if (input.env !== "production") reasons.push("production_environment_required");
  if (!input.minerConfigured) reasons.push("miner_configuration_missing");
  if (!input.minerConnected) reasons.push("miner_not_connected");
  if (!input.poolConfigured) reasons.push("pool_configuration_missing");
  if (!input.poolConnected) reasons.push("pool_not_connected");
  if (!input.walletConfigured) reasons.push("wallet_configuration_missing");
  if (!input.walletReachable) reasons.push("wallet_not_reachable");

  const evidence = input.realMiningEvidence;
  if (!evidence) {
    reasons.push("real_mining_evidence_missing");
  } else {
    for (const key of REQUIRED_REAL_EVIDENCE) {
      if (!evidence[key]) reasons.push(`real_mining_evidence_${key}_missing`);
    }
  }

  return { enabled: reasons.length === 0, reasons };
}
