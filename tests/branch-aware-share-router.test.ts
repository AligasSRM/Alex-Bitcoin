import { MiningJobBranchManager } from "../src/modules/pool/job-distribution";
import { BranchAwareShareRouter } from "../src/modules/pool/branch-aware-share-router";
import { ShareSubmissionEngine } from "../src/modules/pool/share-submission";
import { MiningWorkerRegistry } from "../src/modules/pool/workers";

const registry = new MiningWorkerRegistry();
registry.register({ workerId: "worker-a", workerName: "A" });
registry.register({ workerId: "worker-b", workerName: "B" });
registry.setState("worker-a", "online");
registry.setState("worker-b", "online");

const router = new BranchAwareShareRouter(
  new MiningJobBranchManager(registry),
  new ShareSubmissionEngine(),
);

const work = {
  jobId: "job-branch",
  headerPrefix76: new Uint8Array(76),
  nonceStart: 0,
  nonceEnd: 9,
  targetHex: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  createdAt: new Date().toISOString(),
};

const distribution = router.registerJob(work);
if (distribution.branches.length !== 2) throw new Error("expected two job branches");
if (distribution.branches[0].workerId !== "worker-a" || distribution.branches[0].nonceStart !== 0 || distribution.branches[0].nonceEnd !== 4) {
  throw new Error("worker-a branch assignment is incorrect");
}
if (distribution.branches[1].workerId !== "worker-b" || distribution.branches[1].nonceStart !== 5 || distribution.branches[1].nonceEnd !== 9) {
  throw new Error("worker-b branch assignment is incorrect");
}

const routed = router.submit({
  workerId: "worker-a",
  jobId: "job-branch",
  extranonce2: "00000001",
  ntime: "65000000",
  nonce: "00000002",
});
if (!routed.routed || routed.branchId !== "job-branch:branch:1" || !routed.acceptedForPool) {
  throw new Error("valid branch share was not routed and accepted");
}

const wrongRange = router.submit({
  workerId: "worker-a",
  jobId: "job-branch",
  extranonce2: "00000002",
  ntime: "65000000",
  nonce: "00000006",
});
if (wrongRange.routed || wrongRange.acceptedForPool || wrongRange.routingReason !== "nonce_out_of_branch_range") {
  throw new Error("out-of-branch share was accepted");
}

const wrongWorker = router.submit({
  workerId: "worker-c",
  jobId: "job-branch",
  extranonce2: "00000003",
  ntime: "65000000",
  nonce: "00000002",
});
if (wrongWorker.routed || wrongWorker.acceptedForPool || wrongWorker.routingReason !== "worker_not_assigned") {
  throw new Error("unassigned worker share was accepted");
}

const unknown = router.submit({
  workerId: "worker-a",
  jobId: "missing",
  extranonce2: "00000004",
  ntime: "65000000",
  nonce: "00000002",
});
if (unknown.routed || unknown.acceptedForPool || unknown.routingReason !== "unknown_job") {
  throw new Error("unknown job was accepted");
}

console.log("branch-aware share routing tests passed");
