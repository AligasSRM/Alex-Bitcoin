import { stratumJobToMiningWork } from "../src/modules/pool/stratum-v1-job";
import { StratumV1UpstreamClient, type StratumV1Job } from "../src/modules/pool/stratum-v1-upstream";
import { searchMiningWork } from "../src/modules/mining/search";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`missing required environment variable: ${name}`);
  return value;
}

function positiveInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
}

function validateBtcAddress(value: string): void {
  // Syntax guard only. Address ownership and network validity remain the user's responsibility.
  if (value.length < 26 || value.length > 90 || !/^[13bcBC][A-Za-z0-9]+$/.test(value)) {
    throw new Error("BTC_ADDRESS has an invalid Bitcoin-address-like format");
  }
}

const host = required("STRATUM_HOST");
const port = positiveInt("STRATUM_PORT", 3333);
const btcAddress = required("BTC_ADDRESS");
const workerName = required("STRATUM_WORKER");
const password = process.env.STRATUM_PASSWORD ?? "x";
const maxHashes = positiveInt("MAX_HASHES_PER_JOB", 100_000);
const maxJobs = positiveInt("MAX_JOBS", 1);
const timeoutMs = positiveInt("STRATUM_TIMEOUT_MS", 15_000);
validateBtcAddress(btcAddress);

let jobCount = 0;
let submitted = 0;
let accepted = 0;
let rejected = 0;
let totalHashes = 0;
let activeExtranonce2 = "";
let activeJob: StratumV1Job | undefined;

function makeExtranonce2(size: number): string {
  const bytes = Buffer.alloc(size);
  const value = BigInt(Date.now()) ^ BigInt(process.pid);
  let n = value;
  for (let i = size - 1; i >= 0; i -= 1) {
    bytes[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return bytes.toString("hex").padStart(size * 2, "0").slice(-size * 2);
}

const client = new StratumV1UpstreamClient({
  host,
  port,
  workerName,
  password,
  timeoutMs,
  jobToMiningWork: (job, extranonce1, extranonce2Size, shareTargetHex) => {
    activeJob = job;
    activeExtranonce2 = makeExtranonce2(extranonce2Size);
    return stratumJobToMiningWork(job, {
      extranonce1,
      extranonce2: activeExtranonce2,
      shareTargetHex,
    });
  },
});

console.log(JSON.stringify({
  event: "real-stratum-smoke-start",
  host,
  port,
  worker: workerName,
  btcAddress,
  maxHashesPerJob: maxHashes,
  maxJobs,
}, null, 2));

const unsubscribe = client.onJob((work) => {
  if (jobCount >= maxJobs) return;
  jobCount += 1;
  const result = searchMiningWork(work, { maxHashes });
  totalHashes += result.hashesTried;

  console.log(JSON.stringify({
    event: "real-job-processed",
    jobId: result.jobId,
    hashesTried: result.hashesTried,
    elapsedMs: result.elapsedMs,
    found: result.found,
  }));

  if (!result.found || result.nonce === undefined || !activeJob) {
    if (jobCount >= maxJobs) void finish();
    return;
  }

  submitted += 1;
  void client.submitShare({
    workerId: workerName,
    jobId: result.jobId,
    extranonce2: activeExtranonce2,
    ntime: activeJob.ntime,
    nonce: result.nonce.toString(16).padStart(8, "0"),
  }).then((ok) => {
    if (ok) accepted += 1;
    else rejected += 1;
    console.log(JSON.stringify({
      event: ok ? "share-accepted" : "share-rejected",
      jobId: result.jobId,
      nonce: result.nonce,
    }));
    void finish();
  }).catch((error: unknown) => {
    rejected += 1;
    console.error(JSON.stringify({
      event: "share-submit-error",
      error: error instanceof Error ? error.message : String(error),
    }));
    void finish();
  });
});

async function finish(): Promise<void> {
  unsubscribe();
  await client.disconnect();
  console.log(JSON.stringify({
    event: "real-stratum-smoke-finished",
    connected: true,
    subscribed: true,
    authorized: true,
    jobsReceived: jobCount,
    sharesSubmitted: submitted,
    sharesAccepted: accepted,
    sharesRejected: rejected,
    hashesTried: totalHashes,
    realPoolAcceptedShare: accepted > 0,
    note: accepted > 0
      ? "Real pool acceptance observed."
      : "No accepted share observed in the bounded scan; this is not activation evidence.",
  }, null, 2));
  process.exitCode = accepted > 0 ? 0 : 2;
}

client.connect().catch(async (error: unknown) => {
  console.error(JSON.stringify({
    event: "real-stratum-smoke-failed",
    error: error instanceof Error ? error.message : String(error),
  }));
  await client.disconnect();
  process.exitCode = 1;
});
