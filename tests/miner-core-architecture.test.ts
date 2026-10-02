import { MinerCore } from "../src/modules/mining/miner-core";
import { hashHeader, hashToDisplayHex } from "../src/modules/mining/sha256d";
import { BitcoinCoreRegtestBoundary } from "../src/modules/mining/bitcoin-core-boundary";

const workers = new MinerCore();
const workerRegistry = workers.getWorkerRegistry();
workerRegistry.register({ workerId: "worker-a", workerName: "ASIC A" });
workerRegistry.register({ workerId: "worker-b", workerName: "ASIC B" });
workerRegistry.setState("worker-a", "online");
workerRegistry.setState("worker-b", "online");

const header = new Uint8Array(76);
const work = {
  jobId: "stage4a1-job-1",
  headerPrefix76: header,
  nonceStart: 0,
  nonceEnd: 9,
  targetHex: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  createdAt: new Date().toISOString(),
};

workers.registerWork(work);
workers.activateJob(work.jobId);
const branches = workers.getBranchManager().snapshot(work.jobId).branches;
if (branches.length !== 2) throw new Error("expected two worker branches");
if (branches[0].nonceStart !== 0 || branches[0].nonceEnd !== 4) throw new Error("worker-a branch mismatch");
if (branches[1].nonceStart !== 5 || branches[1].nonceEnd !== 9) throw new Error("worker-b branch mismatch");
if (branches[0].nonceEnd >= branches[1].nonceStart) throw new Error("worker nonce ranges overlap");

const result = workers.mine(work.jobId, "worker-a", { maxHashes: 1 });
if (!result.found || result.nonce !== 0 || result.hashesTried !== 1) throw new Error("miner search did not execute deterministically");

const hash = hashHeader(header, 0);
if (hashToDisplayHex(hash).length !== 64) throw new Error("invalid SHA-256d display hash");

let invalidRejected = false;
try {
  workers.registerWork({ ...work, jobId: "bad", nonceStart: 10, nonceEnd: 0 });
} catch {
  invalidRejected = true;
}
if (!invalidRejected) throw new Error("invalid work was accepted");

const transport = {
  async getBlockTemplate() { return { jobId: "regtest-template", headerPrefix76: header, targetHex: work.targetHex, createdAt: new Date().toISOString() }; },
  async submitBlock(blockHex: string) { return blockHex.length >= 160 ? "accepted" as const : "rejected" as const; },
};
const boundary = new BitcoinCoreRegtestBoundary(transport);
const template = await boundary.getBlockTemplate();
if (template.jobId !== "regtest-template") throw new Error("template boundary failed");
if (await boundary.submitBlock("00".repeat(80)) !== "accepted") throw new Error("submitblock boundary failed");
if (await boundary.submitBlock("bad") !== "rejected") throw new Error("invalid submitblock payload was not rejected");

const audit = workers.auditSnapshot();
if (!audit.some((event) => event.type === "started" && event.jobId === work.jobId)) throw new Error("job start was not audited");
if (!audit.some((event) => event.type === "found" && event.nonce === 0)) throw new Error("successful mining was not audited");

workers.rollover({ ...work, jobId: "stage4a1-job-2" });
if (workers.jobSnapshot().length !== 1 || workers.jobSnapshot()[0].jobId !== "stage4a1-job-2") throw new Error("job rollover failed");

console.log("stage 4A.1 miner core architecture tests passed");
