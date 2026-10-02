import assert from "node:assert/strict";
import { BitcoinCoreTemplateRuntimeOrchestrator } from "../src/modules/mining/template-runtime-orchestrator";
import { MinerCore } from "../src/modules/mining/miner-core";

const core = new MinerCore();
const boundary = {
  async getBlockTemplate() {
    return {
      jobId: "core-job-1",
      headerPrefix76: new Uint8Array(76),
      targetHex: "ff".repeat(32),
      createdAt: "2026-10-02T18:00:00.000Z",
    };
  },
  async submitBlock() {
    return "accepted" as const;
  },
};

const orchestrator = new BitcoinCoreTemplateRuntimeOrchestrator(core, boundary);
assert.equal(await orchestrator.refreshWork(), "core-job-1");
assert.equal(core.jobSnapshot()[0]?.jobId, "core-job-1");
assert.throws(() => orchestrator.startWorker({ workerId: "missing", maxHashes: 1 }), /worker is not assigned/);

const worker = core.getWorkerRegistry().register({ workerId: "worker-a", workerName: "Test Worker" });
assert.equal(worker.workerId, "worker-a");
const result = await orchestrator.startWorker({ workerId: "worker-a", maxHashes: 1 });
assert.equal(result.jobId, "core-job-1");
assert.equal(result.hashesTried, 1);
assert.equal(orchestrator.snapshot().activeJobId, "core-job-1");

console.log("stage 4A.7 template runtime orchestration tests passed");
