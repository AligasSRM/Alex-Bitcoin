import { hashHeader, hashToDisplayHex } from "../src/modules/mining/sha256d";
import { validateMiningShare } from "../src/modules/mining/share";

const headerPrefix76 = new Uint8Array(76);
const work = {
  jobId: "share-job",
  headerPrefix76,
  nonceStart: 0,
  nonceEnd: 2,
  targetHex: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  createdAt: new Date().toISOString(),
};

const validHash = hashToDisplayHex(hashHeader(headerPrefix76, 1));

const accepted = validateMiningShare(work, {
  jobId: "share-job",
  workerId: "rig-1",
  nonce: 1,
  hashHex: validHash,
});
if (!accepted.accepted || accepted.hashHex !== validHash) throw new Error("valid share was rejected");

const mismatch = validateMiningShare(work, {
  jobId: "share-job",
  workerId: "rig-1",
  nonce: 1,
  hashHex: "00".repeat(32),
});
if (mismatch.accepted || mismatch.reason !== "invalid_hash") throw new Error("hash mismatch was accepted");

const outOfRange = validateMiningShare(work, {
  jobId: "share-job",
  workerId: "rig-1",
  nonce: 3,
});
if (outOfRange.accepted || outOfRange.reason !== "nonce_out_of_range") throw new Error("out-of-range nonce was accepted");

const invalidNonce = validateMiningShare(work, {
  jobId: "share-job",
  workerId: "rig-1",
  nonce: -1,
});
if (invalidNonce.accepted || invalidNonce.reason !== "invalid_nonce") throw new Error("invalid nonce was accepted");

const impossibleTarget = validateMiningShare(
  { ...work, targetHex: "0000000000000000000000000000000000000000000000000000000000000000" },
  { jobId: "share-job", workerId: "rig-1", nonce: 1 },
);
if (impossibleTarget.accepted || impossibleTarget.reason !== "target_not_met") throw new Error("target failure was accepted");

const invalidHash = validateMiningShare(work, {
  jobId: "share-job",
  workerId: "rig-1",
  nonce: 1,
  hashHex: "abc",
});
if (invalidHash.accepted || invalidHash.reason !== "invalid_hash") throw new Error("malformed hash was accepted");

console.log("share validation tests passed");
