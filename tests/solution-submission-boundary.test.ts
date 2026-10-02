import assert from "node:assert/strict";
import { MiningSolutionSubmissionBoundary } from "../src/modules/mining/solution-submission-boundary";
import type { MiningEngineResult } from "../src/modules/mining/sha256d-engine";

const calls: string[] = [];
const boundary = new MiningSolutionSubmissionBoundary(
  {
    async getBlockTemplate() {
      throw new Error("not used");
    },
    async submitBlock(blockHex) {
      calls.push(blockHex);
      return "accepted";
    },
  },
  () => "00".repeat(80),
);

const solved: MiningEngineResult = {
  jobId: "job-1",
  workerId: "worker-a",
  found: true,
  nonce: 7,
  hashHex: "00".repeat(32),
  hashesTried: 8,
  startedAt: "2026-10-02T18:00:00.000Z",
  finishedAt: "2026-10-02T18:00:00.001Z",
  elapsedMs: 1,
  hashrateHps: 8000,
  stopped: false,
};

const submitted = await boundary.submit(solved);
assert.equal(submitted.status, "accepted");
assert.equal(submitted.nonce, 7);
assert.equal(submitted.blockHex, "00".repeat(80));
assert.deepEqual(calls, ["00".repeat(80)]);

await assert.rejects(
  () => boundary.submit({ ...solved, found: false, nonce: undefined, hashHex: undefined }),
  /cannot submit an unsolved mining result/,
);

const invalid = new MiningSolutionSubmissionBoundary(
  boundary as never,
  () => "not-a-block",
);
await assert.rejects(() => invalid.submit(solved), /invalid assembled block/);

console.log("stage 4A.8 solution submission boundary tests passed");
