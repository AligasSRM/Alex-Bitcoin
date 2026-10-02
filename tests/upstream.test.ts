import { MiningProxy } from "../src/modules/pool/proxy";
import { MiningUpstreamBinding, UpstreamRecoverySupervisor, type UpstreamJobSource, type UpstreamState } from "../src/modules/pool/upstream";
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
let upstreamState: UpstreamState = "disconnected";
let connectFailures = 0;
let connectCalls = 0;
let disconnectCalls = 0;
const submitted: string[] = [];
const retryDelays: number[] = [];

const upstream: UpstreamJobSource = {
  async connect() {
    connectCalls += 1;
    if (connectFailures > 0) {
      connectFailures -= 1;
      throw new Error("simulated upstream connect failure");
    }
    connected = true;
    upstreamState = "connected";
  },
  async disconnect() {
    connected = false;
    upstreamState = "disconnected";
    disconnectCalls += 1;
  },
  getState() { return upstreamState; },
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
await binding.reconnect();
if (binding.snapshot().connectionGeneration !== 4) throw new Error("connection generation did not advance safely");
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
if (binding.snapshot().submittedShares !== 1 || binding.snapshot().acceptedShares !== 1 || binding.snapshot().rejectedShares !== 2) {
  throw new Error("upstream share counters incorrect");
}

connectFailures = 2;
await binding.reconnectWithPolicy({
  maxAttempts: 3,
  initialDelayMs: 10,
  maxDelayMs: 25,
  sleep: async (delayMs) => { retryDelays.push(delayMs); },
});
if (connectFailures !== 0 || retryDelays.length !== 2 || retryDelays[0] !== 10 || retryDelays[1] !== 20) {
  throw new Error("upstream reconnect backoff policy did not retry deterministically");
}
if (binding.snapshot().state !== "connected" || binding.snapshot().connectionGeneration !== 7) {
  throw new Error("upstream retry policy did not establish a new generation");
}

await binding.disconnect();
if (binding.snapshot().state !== "disconnected") throw new Error("upstream did not remain safely disconnected");

connectFailures = 1;
const supervisor = new UpstreamRecoverySupervisor(binding, {
  maxAttempts: 2,
  initialDelayMs: 5,
  maxDelayMs: 5,
  sleep: async (delayMs) => { retryDelays.push(delayMs); },
});
const recoveryA = supervisor.recover();
const recoveryB = supervisor.recover();
if (recoveryA !== recoveryB || !supervisor.isRecovering()) throw new Error("recovery was not serialized");
await recoveryA;
if (connectFailures !== 0 || binding.snapshot().state !== "connected" || binding.snapshot().connectionGeneration !== 10) {
  throw new Error("recovery supervisor did not establish the expected generation");
}
if (supervisor.isRecovering()) throw new Error("recovery supervisor remained active after completion");
if (await supervisor.recoverIfNeeded()) throw new Error("connected upstream triggered unnecessary recovery");

upstreamState = "degraded";
const degradedShare = await binding.submitShare({
  workerId: "worker-a",
  jobId: "upstream-job",
  extranonce2: "00000001",
  ntime: "65000000",
  nonce: "00000001",
});
if (degradedShare || submitted.length !== 1) throw new Error("degraded upstream forwarded a share");

if (!(await supervisor.recoverIfNeeded()) || binding.snapshot().state !== "connected" || binding.snapshot().connectionGeneration !== 12) {
  throw new Error("degraded upstream did not recover through the supervisor");
}

await binding.disconnect();
if (binding.snapshot().state !== "disconnected") throw new Error("upstream did not remain safely disconnected");

console.log("upstream binding lifecycle tests passed");
