import { MiningProxy } from "../src/modules/pool/proxy";
import { MiningUpstreamBinding, type UpstreamJobSource } from "../src/modules/pool/upstream";

const work = {
  jobId: "upstream-job",
  headerPrefix76: new Uint8Array(76),
  nonceStart: 0,
  nonceEnd: 10,
  targetHex: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  createdAt: new Date().toISOString(),
};

let jobHandler: ((work: typeof work) => void) | undefined;
let connected = false;
const submitted: string[] = [];

const upstream: UpstreamJobSource = {
  async connect() { connected = true; },
  async disconnect() { connected = false; },
  getState() { return connected ? "connected" : "disconnected"; },
  onJob(handler) { jobHandler = handler; return () => { jobHandler = undefined; }; },
  async submitShare(request) { submitted.push(request.jobId); return request.jobId === "upstream-job"; },
};

const proxy = new MiningProxy({ proxyId: "alex-proxy-upstream" });
proxy.start();
const binding = new MiningUpstreamBinding(proxy, upstream);

await binding.connect();
if (binding.snapshot().state !== "connected") throw new Error("upstream did not connect");

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

const rejected = await binding.submitShare({
  workerId: "worker-a",
  jobId: "missing",
  extranonce2: "00000001",
  ntime: "65000000",
  nonce: "00000001",
});
if (rejected) throw new Error("rejected upstream share accepted");
if (binding.snapshot().submittedShares !== 2 || binding.snapshot().acceptedShares !== 1 || binding.snapshot().rejectedShares !== 1) {
  throw new Error("upstream share counters incorrect");
}

await binding.disconnect();
if (binding.snapshot().state !== "disconnected" || binding.snapshot().activeJobs !== 0) throw new Error("upstream disconnect failed");

console.log("upstream binding tests passed");
