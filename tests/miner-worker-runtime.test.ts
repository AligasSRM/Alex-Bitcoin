import { MinerCore } from "../src/modules/mining/miner-core";
import { MinerWorkerRuntime } from "../src/modules/mining/miner-worker-runtime";

const core = new MinerCore();
const registry = core.getWorkerRegistry();
registry.register({ workerId: "worker-a", workerName: "ASIC A" });
registry.register({ workerId: "worker-b", workerName: "ASIC B" });
registry.setState("worker-a", "online");
registry.setState("worker-b", "online");

const work = {
  jobId: "stage4a3-job-1",
  headerPrefix76: new Uint8Array(76),
  nonceStart: 0,
  nonceEnd: 9,
  targetHex: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  createdAt: new Date().toISOString(),
};

core.registerWork(work);
core.activateJob(work.jobId);

const runtime = new MinerWorkerRuntime(core);
const first = runtime.start(work.jobId, "worker-a", { maxHashes: 1 });
if (runtime.snapshot().runningWorkerIds.length !== 1) throw new Error("worker did not enter runtime");

const result = await first;
if (!result.found || result.hashesTried !== 1 || result.workerId !== "worker-a") {
  throw new Error("runtime worker did not execute one deterministic hash");
}
if (registry.get("worker-a")?.hashrateHps <= 0) throw new Error("worker hashrate was not recorded");
if (runtime.snapshot().runningWorkerIds.length !== 0) throw new Error("completed worker remained running");

const stopped = runtime.start(work.jobId, "worker-a");
runtime.stopWorker("worker-a");
const stoppedResult = await stopped;
if (!stoppedResult.stopped || stoppedResult.found || stoppedResult.hashesTried !== 0) {
  throw new Error("worker stop lifecycle failed");
}

const rolloverWork = { ...work, jobId: "stage4a3-job-2" };
const rolloverRun = runtime.start(work.jobId, "worker-b");
await runtime.rollover(rolloverWork);
const oldResult = await rolloverRun;
if (!oldResult.stopped || oldResult.found || oldResult.hashesTried !== 0) {
  throw new Error("old job worker was not stopped during rollover");
}
if (runtime.snapshot().activeJobId !== rolloverWork.jobId) throw new Error("runtime active job did not roll over");
if (core.jobSnapshot().length !== 1 || core.jobSnapshot()[0].jobId !== rolloverWork.jobId) {
  throw new Error("core job rollover state is incorrect");
}

const second = runtime.start(rolloverWork.jobId, "worker-a", { maxHashes: 1 });
const secondResult = await second;
if (!secondResult.found || secondResult.hashesTried !== 1) throw new Error("new job worker did not start");

const snapshot = runtime.snapshot();
if (snapshot.totalHashrateHps <= 0) throw new Error("runtime total hashrate was not measured");

console.log("stage 4A.3 miner worker runtime tests passed");
