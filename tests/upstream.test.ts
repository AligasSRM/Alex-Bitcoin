import { MiningProxy } from "../src/modules/pool/proxy";
import { MiningUpstreamBinding, type UpstreamJobSource } from "../src/modules/pool/upstream";
import type { MiningWork } from "../src/modules/mining/types";

const work: MiningWork = {
  jobId: "upstream-job",
  headerPrefix76: new Uint8Array(76),
  nonceStart: 0,
  nonceEnd: 10,
  targetHex: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  createdAt: new Date().toISOString(),
};

let jobHandler: ((job: MiningWork) => void) | undefined;
let connected = false;
let connectCalls = 0;
let disconnectCalls = 0;
const submitted: string[] = [];

const upstream: UpstreamJobSource = {
  async connect() { connected = true; connectCalls += 1; },
  async disconnect() { connected = false; disconnectCalls += 1; },
  getState() { return connected ? "connected" : "disconnected"; },
  onJob(handler) { jobHandler = handler; return () => { jobHandler = undefined; }; },
  async submitShare(request) { submitted.push(request.jobId); return request.jobId === "upstream-job"; },
};

const proxy = new MiningProxy({ proxyId: "alex-proxy-upstream" });
proxy.start();
const binding = new MiningUpstreamBinding(proxy, upstream);

await binding.connect();
await binding.connect();
if (connectCalls !== 1) throw new Error("upstream connect was not idempotent");
if (binding.snapshot().state !== "connected" || binding.snapshot().connectionGeneration !== 1) {
  throw new Error("upstream did not establish the first connection generation");
}

jobHandler?.(work);
if (binding.snapshot().activeJobs !== 1 || proxy.snapshot().registeredJobs !== 1) throw new Error("upstream job was not bridged");

const accepted = await binding.submitShare({
  workerId: "worker-a",
  jobId: "upstream-job",
  extranonce2: "00000001",
  ntime: "65000000",
  nonce: "00000001",
});
if (!accepted || submitted.length !== 1) throw new Error("accepted upstream share failed");

const rejectedUnknown = await binding.submitShare({
  workerId: "worker-a",
  jobId: "missing",
  extranonce2: "00000001",
  ntime: "65000000",
  nonce: "00000001",
});
if (rejectedUnknown || submitted.length !== 1) throw new Error("unknown upstream job was forwarded");

await binding.disconnect();
if (disconnectCalls !== 1 || binding.snapshot().state !== "disconnected" || binding.snapshot().activeJobs !== 0 || proxy.snapshot().registeredJobs !== 0) {
  throw new Error("upstream disconnect failed to retire jobs");
}

const rejectedDisconnected = await binding.submitShare({
  workerId: "worker-a",
  jobId: "upstream-job",
  extranonce2: "00000001",
  ntime: "65000000",
  nonce: "00000001",
});
if (rejectedDisconnected || submitted.length !== 1) throw new Error("share was forwarded while disconnected");

const staleHandler = jobHandler;
await binding.connect();
if (binding.snapshot().connectionGeneration !== 3) throw new Error("connection generation did not advance safely");
const currentHandler = jobHandler;
if (!currentHandler) throw new Error("new upstream job handler was not registered");

staleHandler?.(work);
if (binding.snapshot().activeJobs !== 0 || proxy.snapshot().registeredJobs !== 0) {
  throw new Error("stale upstream handler resurrected an old job");
}

currentHandler(work);
if (binding.snapshot().activeJobs !== 1 || proxy.snapshot().registeredJobs !== 1) {
  throw new Error("current upstream handler did not bridge the new job");
}

await binding.disconnect();
if (binding.snapshot().submittedShares !== 1 || binding.snapshot().acceptedShares !== 1 || binding.snapshot().rejectedShares !== 3) {
  throw new Error("upstream share counters incorrect");
}

console.log("upstream binding lifecycle tests passed");
