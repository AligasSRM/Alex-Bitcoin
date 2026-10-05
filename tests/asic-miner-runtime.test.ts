import assert from "node:assert/strict";
import type { AsicMinerRuntime } from "../src/modules/miner/asic-runtime";
import { assertAsicMinerRuntime } from "../src/modules/miner/asic-runtime";

const telemetry = {
  minerId: "asic-test-1", model: "TEST-ASICS", connection: "connected" as const,
  hashrateHps: 1, temperatureC: 40, powerWatts: 100, acceptedShares: 1, rejectedShares: 0,
  observedAt: new Date().toISOString(),
};
let started = false;
let stopped = false;
const miner: AsicMinerRuntime = {
  kind: "asic", endpoint: "test://asic",
  async connect() {}, async disconnect() {},
  async startMining() { started = true; },
  async stopMining() { stopped = true; },
  async getTelemetry() { return telemetry; },
};
assertAsicMinerRuntime(miner);
await miner.connect(); await miner.startMining(); assert.equal(started, true);
await miner.stopMining(); assert.equal(stopped, true); await miner.disconnect();
assert.throws(() => assertAsicMinerRuntime({...miner, endpoint: " "} as AsicMinerRuntime), /endpoint/);
console.log("ASIC miner runtime contract tests passed");
