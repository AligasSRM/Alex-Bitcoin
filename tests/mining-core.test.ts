import {
  hashHeader,
  hashMeetsTarget,
  hashToDisplayHex,
  searchMiningWork,
  serializeHeaderWithNonce,
  sha256d,
  validateMiningWork,
} from "../src/modules/mining";

const helloHash = sha256d(new TextEncoder().encode("hello"));
if (hashToDisplayHex(helloHash) !== "503d8319a48348cdc610a582f7bf754b5833df65038606eb48510790dfc99595") {
  throw new Error("SHA-256d vector mismatch");
}

const genesisMerkle = "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b";
const prefix = new Uint8Array(76);
const view = new DataView(prefix.buffer);
view.setUint32(0, 1, true);
prefix.set(new Uint8Array(32), 4);
prefix.set(Uint8Array.from(Buffer.from(genesisMerkle, "hex")).reverse(), 36);
view.setUint32(68, 1231006505, true);
view.setUint32(72, 0x1d00ffff, true);

const genesisHeader = serializeHeaderWithNonce(prefix, 2083236893);
if (genesisHeader.byteLength !== 80) throw new Error("header serialization failed");

const genesisHash = hashToDisplayHex(hashHeader(prefix, 2083236893));
const expectedGenesisHash = "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f";
if (genesisHash !== expectedGenesisHash) throw new Error("genesis hash mismatch: " + genesisHash);

const target = "00000000ffff0000000000000000000000000000000000000000000000000000";
if (!hashMeetsTarget(hashHeader(prefix, 2083236893), target)) throw new Error("valid genesis PoW rejected");

const work = {
  jobId: "genesis-test",
  headerPrefix76: prefix,
  nonceStart: 2083236893,
  nonceEnd: 2083236893,
  targetHex: target,
  createdAt: new Date().toISOString(),
};

validateMiningWork(work);
const result = searchMiningWork(work);
if (!result.found || result.nonce !== 2083236893 || result.hashesTried !== 1) {
  throw new Error("real nonce search failed");
}

let rejected = false;
try {
  validateMiningWork({ ...work, headerPrefix76: new Uint8Array(75) });
} catch {
  rejected = true;
}
if (!rejected) throw new Error("invalid header length was not rejected");

console.log("mining core tests passed");
