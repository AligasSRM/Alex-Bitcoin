import { MiningJobBranchManager } from "../src/modules/pool/job-distribution";
import { MiningWorkerRegistry } from "../src/modules/pool/workers";

const registry = new MiningWorkerRegistry();
registry.register({ workerId: "worker-b", workerName: "b" });
registry.register({ workerId: "worker-a", workerName: "a" });
registry.register({ workerId: "worker-offline", workerName: "offline" });
registry.setState("worker-a", "online");
registry.setState("worker-b", "online");

const manager = new MiningJobBranchManager(registry);
const work = {
  jobId: "job-1",
  headerPrefix76: new Uint8Array(76),
  nonceStart: 0,
  nonceEnd: 9,
  targetHex: "00ff",
  createdAt: new Date().toISOString(),
};

const snapshot = manager.distribute(work);
if (snapshot.branchCount !== 2) throw new Error("branch count incorrect");
if (snapshot.branches[0].workerId !== "worker-a" || snapshot.branches[1].workerId !== "worker-b") throw new Error("worker assignment is not deterministic");
if (snapshot.branches[0].nonceStart !== 0 || snapshot.branches[0].nonceEnd !== 4) throw new Error("first nonce branch incorrect");
if (snapshot.branches[1].nonceStart !== 5 || snapshot.branches[1].nonceEnd !== 9) throw new Error("second nonce branch incorrect");

let noWorkersRejected = false;
const emptyRegistry = new MiningWorkerRegistry();
try {
  new MiningJobBranchManager(emptyRegistry).distribute(work);
} catch {
  noWorkersRejected = true;
}
if (!noWorkersRejected) throw new Error("distribution proceeded without online workers");

let invalidRangeRejected = false;
try {
  manager.distribute({ ...work, nonceStart: 10, nonceEnd: 9 });
} catch {
  invalidRangeRejected = true;
}
if (!invalidRangeRejected) throw new Error("invalid nonce range was accepted");

console.log("job distribution branch manager tests passed");
