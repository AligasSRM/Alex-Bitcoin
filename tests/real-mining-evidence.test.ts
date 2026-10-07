import assert from "node:assert/strict";
import { validateRealMiningEvidence, type RealMiningEvidenceRecord } from "../src/services/real-mining-evidence";

const base: RealMiningEvidenceRecord = {
  source: "asic",
  observedAt: "2026-10-06T20:00:00.000Z",
  asicIdentityVerified: true,
  stratumSubscribed: true,
  stratumAuthorized: true,
  realJobReceived: true,
  realShareSubmitted: true,
  poolAcceptedShare: true,
  telemetryVerified: true,
  poolHost: "pool.example",
  poolPort: 3333,
  workerId: "user.worker1",
  jobId: "job-1",
};

assert.deepEqual(validateRealMiningEvidence(base), []);
assert.deepEqual(
  validateRealMiningEvidence({ ...base, source: "cpu-smoke" }),
  ["real_mining_evidence_asic_source_required"],
);
assert.deepEqual(
  validateRealMiningEvidence({ ...base, poolAcceptedShare: false }),
  ["real_mining_evidence_poolAcceptedShare_missing"],
);
assert.deepEqual(
  validateRealMiningEvidence({ ...base, observedAt: "not-a-date" }),
  ["real_mining_evidence_observed_at_invalid"],
);

console.log("real mining evidence validation tests passed");
