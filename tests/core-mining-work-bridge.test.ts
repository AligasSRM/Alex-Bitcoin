import assert from "node:assert/strict";
import { miningWorkFromBitcoinCoreTemplate } from "../src/modules/mining/core-mining-work-bridge";

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
