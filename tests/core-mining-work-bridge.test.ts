import assert from "node:assert/strict";
import { BitcoinCoreStratumWorkBridge, miningWorkFromBitcoinCoreTemplate } from "../src/modules/mining/core-mining-work-bridge";
import { StratumMiningBridge } from "../src/modules/pool/bridge";

const template = {
  jobId: "regtest-job",
  headerPrefix76: new Uint8Array(76),
  targetHex: "ab".repeat(32),
  createdAt: "2026-10-02T18:00:00.000Z",
};

const work = miningWorkFromBitcoinCoreTemplate(template);
assert.equal(work.jobId, "regtest-job");
assert.equal(work.headerPrefix76.length, 76);
assert.equal(work.nonceStart, 0);
assert.equal(work.nonceEnd, 0xffffffff);
assert.equal(work.targetHex, "ab".repeat(32));
assert.equal(work.createdAt, template.createdAt);

assert.throws(
  () => miningWorkFromBitcoinCoreTemplate({ ...template, headerPrefix76: new Uint8Array(75) }),
  /76 bytes/,
);
assert.throws(
  () => miningWorkFromBitcoinCoreTemplate({ ...template, targetHex: "00" }),
  /invalid mining target/,
);

console.log("stage 4A.6 core mining work bridge tests passed");


const stratum = new StratumMiningBridge({
  extranonce1: "01020304",
  extranonce2Size: 4,
  authorize: async () => true,
});
const core = {
  async getBlockTemplate() {
    return { ...template, jobId: "core-stratum-job-1" };
  },
};
const coreStratum = new BitcoinCoreStratumWorkBridge(core, stratum);
const bridged = await coreStratum.refreshWork();
assert.equal(bridged.jobId, "core-stratum-job-1");
assert.equal(coreStratum.getActiveJobId(), "core-stratum-job-1");
assert.equal(stratum.shares.submit({
  workerId: "rig-1",
  jobId: "core-stratum-job-1",
  extranonce2: "00000001",
  ntime: "65000000",
  nonce: "00000000",
}).acceptedForPool, true);

core.getBlockTemplate = async () => ({ ...template, jobId: "core-stratum-job-2" });
await coreStratum.refreshWork();
assert.equal(stratum.session.isJobActive("core-stratum-job-1"), false);
assert.equal(stratum.session.isJobActive("core-stratum-job-2"), true);
coreStratum.retire();
assert.equal(stratum.session.isJobActive("core-stratum-job-2"), false);
assert.equal(coreStratum.getActiveJobId(), undefined);

console.log("stage 4A.6 Core Mining Work + Stratum bridge integration passed");
