import { StratumSession, parseStratumRequest } from "../src/modules/pool/stratum";

const session = new StratumSession({
  extranonce1: "01020304",
  extranonce2Size: 4,
  authorize: async (worker, password) => worker === "rig.1" && password === "x",
  submit: async (share) => share.jobId === "job-1" && share.nonce === "00000001",
});

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

const notify = session.notifyJob("job-1", "00".repeat(32), "aa", "bb", [], "20000000", "1d00ffff", "65000000");
if (notify.method !== "mining.notify" || notify.params[0] !== "job-1") throw new Error("notify payload mismatch");

const difficulty = session.setDifficulty(1);
if (difficulty.method !== "mining.set_difficulty" || difficulty.params[0] !== 1) throw new Error("difficulty notification mismatch");

const invalidJson = parseStratumRequest("{");
if (!("error" in invalidJson) || invalidJson.error?.[0] !== -32700) throw new Error("invalid JSON was not rejected");

const unsupported = await session.handleLine(JSON.stringify({ id: 6, method: "mining.unknown", params: [] }));
if (!("error" in unsupported) || unsupported.error?.[0] !== -32601) throw new Error("unsupported method was not rejected");

console.log("stratum protocol tests passed");
