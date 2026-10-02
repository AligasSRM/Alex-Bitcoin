import { ShareSubmissionEngine } from "../src/modules/pool/share-submission";

const engine = new ShareSubmissionEngine();
const work = {
  jobId: "pool-job",
  headerPrefix76: new Uint8Array(76),
  nonceStart: 0,
  nonceEnd: 10,
  targetHex: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  createdAt: new Date().toISOString(),
};
engine.registerJob(work);

const accepted = engine.submit({
  workerId: "rig-1",
  jobId: "pool-job",
  extranonce2: "00000001",
  ntime: "65000000",
  nonce: "00000001",
});
if (!accepted.acceptedForPool || accepted.duplicate) throw new Error("valid pool share was not accepted");

const targetRejected = engine.submit({
  workerId: "rig-1",
  jobId: "pool-job",
  extranonce2: "00000002",
  ntime: "65000000",
  nonce: "00000002",
  shareTargetHex: "0000000000000000000000000000000000000000000000000000000000000001",
});
if (targetRejected.acceptedForPool || targetRejected.reason !== "target_not_met") {
  throw new Error("runtime share target was not enforced");
}

const duplicate = engine.submit({
  workerId: "rig-1",
  jobId: "pool-job",
  extranonce2: "00000001",
  ntime: "65000000",
  nonce: "00000001",
});
if (duplicate.acceptedForPool || !duplicate.duplicate) throw new Error("duplicate share was accepted");

const unknown = engine.submit({
  workerId: "rig-1",
  jobId: "missing",
  extranonce2: "00000001",
  ntime: "65000000",
  nonce: "00000001",
});
if (unknown.acceptedForPool || unknown.reason !== "invalid_work") throw new Error("unknown job was accepted");

const invalidNonce = engine.submit({
  workerId: "rig-1",
  jobId: "pool-job",
  extranonce2: "00000001",
  ntime: "65000000",
  nonce: "xyz",
});
if (invalidNonce.acceptedForPool || invalidNonce.reason !== "invalid_nonce") throw new Error("invalid nonce was accepted");

engine.retireJob("pool-job");
const retired = engine.submit({
  workerId: "rig-1",
  jobId: "pool-job",
  extranonce2: "00000002",
  ntime: "65000000",
  nonce: "00000002",
});
if (retired.acceptedForPool || retired.reason !== "invalid_work") throw new Error("retired job was accepted");

console.log("share submission integration tests passed");
