import assert from "node:assert/strict";
import { evaluateProductionActivation, type RealMiningEvidence } from "../src/services/production-activation-gate";

const evidence: RealMiningEvidence = {
  asicIdentityVerified: true,
  stratumSubscribed: true,
  stratumAuthorized: true,
  realJobReceived: true,
  realShareSubmitted: true,
  poolAcceptedShare: true,
  telemetryVerified: true,
};

const base = {
  env: "production" as const,
  minerConfigured: true,
  minerConnected: true,
  poolConfigured: true,
  poolConnected: true,
  walletConfigured: true,
  walletReachable: true,
  realMiningEvidence: evidence,
};

const disabled = evaluateProductionActivation({ ...base, minerConnected: false });
assert.equal(disabled.enabled, false);
assert.deepEqual(disabled.reasons, ["miner_not_connected"]);

const wrongEnvironment = evaluateProductionActivation({ ...base, env: "test" });
assert.equal(wrongEnvironment.enabled, false);
assert.deepEqual(wrongEnvironment.reasons, ["production_environment_required"]);

const noEvidence = evaluateProductionActivation({ ...base, realMiningEvidence: undefined });
assert.equal(noEvidence.enabled, false);
assert.deepEqual(noEvidence.reasons, ["real_mining_evidence_missing"]);

const incompleteEvidence = evaluateProductionActivation({
  ...base,
  realMiningEvidence: { ...evidence, poolAcceptedShare: false },
});
assert.equal(incompleteEvidence.enabled, false);
assert.deepEqual(incompleteEvidence.reasons, ["real_mining_evidence_poolAcceptedShare_missing"]);

const enabled = evaluateProductionActivation(base);
assert.deepEqual(enabled, { enabled: true, reasons: [] });

console.log("production activation gate tests passed");
