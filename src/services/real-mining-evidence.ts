export type RealMiningEvidenceSource = "asic" | "cpu-smoke";

export interface RealMiningEvidenceRecord {
  source: RealMiningEvidenceSource;
  observedAt: string;
  asicIdentityVerified: boolean;
  stratumSubscribed: boolean;
  stratumAuthorized: boolean;
  realJobReceived: boolean;
  realShareSubmitted: boolean;
  poolAcceptedShare: boolean;
  telemetryVerified: boolean;
  poolHost?: string;
  poolPort?: number;
  workerId?: string;
  jobId?: string;
  hashesTried?: number;
}

export const REQUIRED_REAL_MINING_EVIDENCE: ReadonlyArray<keyof Omit<RealMiningEvidenceRecord,
  "source" | "observedAt" | "poolHost" | "poolPort" | "workerId" | "jobId" | "hashesTried"
>> = [
  "asicIdentityVerified",
  "stratumSubscribed",
  "stratumAuthorized",
  "realJobReceived",
  "realShareSubmitted",
  "poolAcceptedShare",
  "telemetryVerified",
];

export function validateRealMiningEvidence(record: RealMiningEvidenceRecord): string[] {
  const reasons: string[] = [];

  if (record.source !== "asic") reasons.push("real_mining_evidence_asic_source_required");
  if (!record.observedAt || Number.isNaN(Date.parse(record.observedAt))) {
    reasons.push("real_mining_evidence_observed_at_invalid");
  }

  for (const key of REQUIRED_REAL_MINING_EVIDENCE) {
    if (!record[key]) reasons.push(`real_mining_evidence_${key}_missing`);
  }

  if (record.poolPort !== undefined && (!Number.isInteger(record.poolPort) || record.poolPort < 1 || record.poolPort > 65535)) {
    reasons.push("real_mining_evidence_pool_port_invalid");
  }

  return reasons;
}
