import assert from "node:assert/strict";
import { BitcoinMiningCycleOrchestrator } from "../src/modules/mining/mining-cycle-orchestrator";
import { BitcoinCoreTemplateRuntimeOrchestrator } from "../src/modules/mining/template-runtime-orchestrator";
import { MinerCore } from "../src/modules/mining/miner-core";
import { MiningSolutionSubmissionBoundary } from "../src/modules/mining/solution-submission-boundary";

const core = new MinerCore();
core.getWorkerRegistry().register({ workerId: "worker-a", workerName: "Cycle Worker" });
core.getWorkerRegistry().setState("worker-a", "online");

const boundary = {
  async getBlockTemplate() {
    return {
      jobId: "cycle-job-1",
      headerPrefix76: new Uint8Array(76),
      targetHex: "ff".repeat(32),
      createdAt: "2026-10-02T18:30:00.000Z",
    };
  },
  async submitBlock(blockHex: string) {
    assert.equal(blockHex, "00".repeat(80));
    return "accepted" as const;
  },
};

const runtime = new BitcoinCoreTemplateRuntimeOrchestrator(core, boundary);
const submission = new MiningSolutionSubmissionBoundary(boundary, () => "00".repeat(80));
const cycle = new BitcoinMiningCycleOrchestrator(runtime, submission);

const result = await cycle.run({ workerId: "worker-a", maxHashes: 1 });
assert.equal(result.mining.jobId, "cycle-job-1");
assert.equal(result.mining.hashesTried, 1);
assert.equal(result.mining.found, true);
assert.equal(result.submission?.status, "accepted");
assert.equal(result.submission?.nonce, 0);

console.log("stage 4A.9 mining cycle orchestration tests passed");
