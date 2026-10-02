import assert from "node:assert/strict";
import { stratumDifficulty1TargetHex, difficultyToTargetHex, stratumJobToMiningWork, stratumNetworkTargetHex } from "../src/modules/pool/stratum-v1-job";
import type { StratumV1Job } from "../src/modules/pool/stratum-v1-upstream";

const job: StratumV1Job = {
  jobId: "job-1",
  prevHash: "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
  coinbase1: "01000000",
  coinbase2: "ffffffff",
  merkleBranches: [],
  version: "20000000",
  nbits: "1d00ffff",
  ntime: "65000000",
  cleanJobs: true,
};

const work = stratumJobToMiningWork(job, {
  extranonce1: "01020304",
  extranonce2: "00000001",
  shareTargetHex: stratumDifficulty1TargetHex(),
});

assert.equal(work.headerPrefix76.length, 76);
assert.equal(work.jobId, "job-1");
assert.equal(work.targetHex, stratumDifficulty1TargetHex());
assert.equal(stratumNetworkTargetHex(job), stratumDifficulty1TargetHex());

const target2 = difficultyToTargetHex(2);
assert.equal(BigInt("0x" + target2), BigInt("0x" + stratumDifficulty1TargetHex()) / 2n);
assert.equal(Buffer.from(work.headerPrefix76.subarray(0, 4)).toString("hex"), "00000020");
assert.equal(Buffer.from(work.headerPrefix76.subarray(4, 36)).toString("hex"), job.prevHash);

assert.throws(() => difficultyToTargetHex(0));
assert.throws(() => stratumJobToMiningWork(job, {
  extranonce1: "01",
  extranonce2: "01",
  shareTargetHex: "00",
}));

console.log("stratum V1 job adapter tests passed");
