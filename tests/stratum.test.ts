import { StratumSession, parseStratumRequest } from "../src/modules/pool/stratum";

const session = new StratumSession({
  extranonce1: "01020304",
  extranonce2Size: 4,
  authorize: async (worker, password) => worker === "rig.1" && password === "x",
  submit: async (share) => share.jobId === "job-1" && share.nonce === "00000001",
});

const preSubscribeDifficulty = new StratumSession({ extranonce1: "05060708" });
let rejectedBeforeSubscribe = false;
try {
  preSubscribeDifficulty.setDifficulty(1);
} catch {
  rejectedBeforeSubscribe = true;
}
if (!rejectedBeforeSubscribe || preSubscribeDifficulty.getDifficulty() !== undefined) {
  throw new Error("difficulty was accepted before subscription");
}

const subscribed = await session.handleLine(JSON.stringify({ id: 1, method: "mining.subscribe", params: [] }));
if (!("error" in subscribed) || subscribed.error !== null) throw new Error("subscribe failed");
if (!session.isSubscribed()) throw new Error("session did not subscribe");

const unauthorized = await session.handleLine(JSON.stringify({
  id: 2,
  method: "mining.submit",
  params: ["rig.1", "job-1", "00000000", "65000000", "00000001"],
}));
if (!("error" in unauthorized) || unauthorized.error?.[0] !== 24) throw new Error("unauthorized submit was accepted");

const authorized = await session.handleLine(JSON.stringify({ id: 3, method: "mining.authorize", params: ["rig.1", "x"] }));
if (!("error" in authorized) || authorized.error !== null || authorized.result !== true) throw new Error("authorize failed");

session.registerJob("job-1");
if (!session.isJobActive("job-1") || session.getJobGeneration() !== 1) throw new Error("job lifecycle registration failed");

const wrongWorker = await session.handleLine(JSON.stringify({
  id: 6, method: "mining.submit",
  params: ["rig.2", "job-1", "00000000", "65000000", "00000001"],
}));
if (!("error" in wrongWorker) || wrongWorker.error?.[0] !== 24) throw new Error("unauthorized worker identity was accepted");

const accepted = await session.handleLine(JSON.stringify({
  id: 4,
  method: "mining.submit",
  params: ["rig.1", "job-1", "00000000", "65000000", "00000001"],
}));
if (!("error" in accepted) || accepted.error !== null || accepted.result !== true) throw new Error("valid share was not accepted");

const rejected = await session.handleLine(JSON.stringify({
  id: 5,
  method: "mining.submit",
  params: ["rig.1", "job-1", "0000000", "65000000", "00000001"],
}));
if (!("error" in rejected) || rejected.error?.[0] !== 20) throw new Error("invalid extranonce2 was not rejected");

session.retireJob("job-1");
if (session.isJobActive("job-1")) throw new Error("retired job remains active");
const stale = await session.handleLine(JSON.stringify({
  id: 7, method: "mining.submit",
  params: ["rig.1", "job-1", "00000000", "65000000", "00000001"],
}));
if (!("error" in stale) || stale.error?.[0] !== 21) throw new Error("stale job was accepted");

const notify = session.notifyJob("job-1", "00".repeat(32), "aa", "bb", [], "20000000", "1d00ffff", "65000000");
if (notify.method !== "mining.notify" || notify.params[0] !== "job-1") throw new Error("notify payload mismatch");

if (!session.isJobActive("job-1")) throw new Error("notifyJob did not reactivate job");
if (session.getJobGeneration() !== 3) throw new Error("job generation did not advance correctly");

const difficulty = session.setDifficulty(1);
if (difficulty.method !== "mining.set_difficulty" || difficulty.params[0] !== 1 || session.getDifficulty() !== 1) {
  throw new Error("difficulty notification/state mismatch");
}

const updatedDifficulty = session.setDifficulty(32.5);
if (updatedDifficulty.params[0] !== 32.5 || session.getDifficulty() !== 32.5) {
  throw new Error("difficulty update did not replace the active value");
}

for (const invalidDifficulty of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
  let rejectedDifficulty = false;
  try {
    session.setDifficulty(invalidDifficulty);
  } catch {
    rejectedDifficulty = true;
  }
  if (!rejectedDifficulty || session.getDifficulty() !== 32.5) {
    throw new Error("invalid difficulty changed or was not rejected");
  }
}

const invalidJson = parseStratumRequest("{");
if (!("error" in invalidJson) || invalidJson.error?.[0] !== -32700) throw new Error("invalid JSON was not rejected");

const unsupported = await session.handleLine(JSON.stringify({ id: 6, method: "mining.unknown", params: [] }));
if (!("error" in unsupported) || unsupported.error?.[0] !== -32601) throw new Error("unsupported method was not rejected");

console.log("stratum protocol tests passed");
