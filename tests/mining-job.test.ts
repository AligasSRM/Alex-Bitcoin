import { MiningJobPipeline } from "../src/modules/mining/job";

const target = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
const prefix = new Uint8Array(76);
const work = {
  jobId: "job-1",
  headerPrefix76: prefix,
  nonceStart: 0,
  nonceEnd: 2,
  targetHex: target,
  createdAt: new Date().toISOString(),
};

const pipeline = new MiningJobPipeline();
const queued = pipeline.submit(work);
if (queued.status !== "queued") throw new Error("job was not queued");
if (pipeline.pendingJobIds().join(",") !== "job-1") throw new Error("queue state mismatch");

const found = pipeline.runNext();
if (!found || found.status !== "found" || found.result?.nonce !== 0) {
  throw new Error("job did not complete with a valid share");
}
if (found.result?.hashesTried !== 1) throw new Error("unexpected hash count");

let duplicateRejected = false;
try {
  pipeline.submit(work);
} catch {
  duplicateRejected = true;
}
if (!duplicateRejected) throw new Error("duplicate job was accepted");

const stoppedPipeline = new MiningJobPipeline();
const stopped = stoppedPipeline.submit({ ...work, jobId: "job-stop" });
if (stopped.status !== "queued") throw new Error("stop test was not queued");
const stoppedSnapshot = stoppedPipeline.stop("job-stop");
if (stoppedSnapshot.status !== "stopped") throw new Error("queued job did not stop");
if (stoppedPipeline.pendingJobIds().length !== 0) throw new Error("stopped job remained queued");

const invalidPipeline = new MiningJobPipeline();
invalidPipeline.submit({ ...work, jobId: "job-invalid", headerPrefix76: new Uint8Array(75) });
const rejected = invalidPipeline.runNext();
if (!rejected || rejected.status !== "rejected") throw new Error("invalid job was not rejected");
if (!rejected.rejectionReason) throw new Error("rejection reason missing");

console.log("mining job pipeline tests passed");
