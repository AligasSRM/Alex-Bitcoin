import assert from "node:assert/strict";
import { evaluateProductionActivation } from "../src/services/production-activation-gate";

const disabled = evaluateProductionActivation({
  env: "production",
  minerConfigured: true,
  minerConnected: false,
  poolConfigured: true,
  poolConnected: true,
  walletConfigured: true,
  walletReachable: true,
});
assert.equal(disabled.enabled, false);
assert.deepEqual(disabled.reasons, ["miner_not_connected"]);

const wrongEnvironment = evaluateProductionActivation({
  env: "test",
  minerConfigured: true,
  minerConnected: true,
  poolConfigured: true,
  poolConnected: true,
  walletConfigured: true,
  walletReachable: true,
});
assert.equal(wrongEnvironment.enabled, false);
assert.deepEqual(wrongEnvironment.reasons, ["production_environment_required"]);

const enabled = evaluateProductionActivation({
  env: "production",
  minerConfigured: true,
  minerConnected: true,
  poolConfigured: true,
  poolConnected: true,
  walletConfigured: true,
  walletReachable: true,
});
assert.deepEqual(enabled, { enabled: true, reasons: [] });

console.log("production activation gate tests passed");
