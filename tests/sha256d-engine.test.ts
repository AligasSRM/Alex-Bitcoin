import { Sha256dMiningEngine } from "../src/modules/mining/sha256d-engine";
import { hashHeader, hashMeetsTarget, hashToDisplayHex } from "../src/modules/mining";

const prefix = new Uint8Array(76);
const target = "00000000ffff0000000000000000000000000000000000000000000000000000";
const genesisNonce = 2083236893;
const work = {
  jobId: "stage4a2-engine-genesis",
  headerPrefix76: prefix,
  nonceStart: genesisNonce,
  nonceEnd: genesisNonce,
  targetHex: "0000000000000000000000000000000000000000000000000000000000000000",
  createdAt: new Date().toISOString(),
};

const engine = new Sha256dMiningEngine();
const result = engine.scan(work, "worker-a", { maxHashes: 1 });
if (!result.found || result.nonce !== genesisNonce || result.hashesTried !== 1) {
  throw new Error("SHA-256d engine failed deterministic scan");
}
if (result.workerId !== "worker-a" || result.hashrateHps <= 0) throw new Error("engine telemetry invalid");

let stop = false;
const stopped = engine.scan(
  { ...work, jobId: "stage4a2-stop", nonceStart: 0, nonceEnd: 1000 },
  "worker-a",
  { stopSignal: () => stop, onHash: (count) => { if (count === 3) stop = true; } },
);
if (!stopped.stopped || stopped.found || stopped.hashesTried !== 3) throw new Error("engine stop signal failed");

const genesisHeaderPrefix = new Uint8Array(76);
const view = new DataView(genesisHeaderPrefix.buffer);
view.setUint32(0, 1, true);
const merkle = "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b";
genesisHeaderPrefix.set(Uint8Array.from(Buffer.from(merkle, "hex")).reverse(), 36);
view.setUint32(68, 1231006505, true);
view.setUint32(72, 0x1d00ffff, true);
const hash = hashHeader(genesisHeaderPrefix, genesisNonce);
const genesisHashHex = hashToDisplayHex(hash);
const expectedGenesisHash = "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f";
if (genesisHashHex !== expectedGenesisHash) throw new Error(`genesis SHA-256d mismatch: ${genesisHashHex}`);
if (!hashMeetsTarget(hash, target)) throw new Error("genesis proof-of-work target check failed");

let invalidMaxRejected = false;
try {
  engine.scan(work, "worker-a", { maxHashes: -1 });
} catch {
  invalidMaxRejected = true;
}
if (!invalidMaxRejected) throw new Error("invalid maxHashes accepted");

console.log("stage 4A.2 SHA-256d mining engine tests passed");
