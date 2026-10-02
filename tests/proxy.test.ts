import { MiningProxy } from "../src/modules/pool/proxy";

const proxy = new MiningProxy({
  proxyId: "alex-proxy-1",
  maxDownstreamSessions: 2,
  session: {
    extranonce1: "01020304",
    authorize: (worker, password) => worker.length > 0 && password === "x",
  },
});

if (proxy.snapshot().state !== "stopped") throw new Error("proxy initial state incorrect");
proxy.start();

proxy.registerJob({
  jobId: "job-1",
  headerPrefix76: new Uint8Array(76),
  nonceStart: 0,
  nonceEnd: 10,
  targetHex: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  createdAt: new Date().toISOString(),
});

const a = proxy.openSession("session-a");
const b = proxy.openSession("session-b");
if (proxy.snapshot().downstreamSessions !== 2) throw new Error("session count incorrect");

const subscribed = await a.bridge.handleLine(JSON.stringify({ id: 1, method: "mining.subscribe", params: [] }));
if (!("error" in subscribed) || subscribed.error !== null) throw new Error("session subscribe failed");
const authorized = await a.bridge.handleLine(JSON.stringify({ id: 2, method: "mining.authorize", params: ["worker-a", "x"] }));
if (!("error" in authorized) || authorized.error !== null || authorized.result !== true) throw new Error("session authorize failed");

const accepted = await a.bridge.handleLine(JSON.stringify({
  id: 3, method: "mining.submit",
  params: ["worker-a", "job-1", "00000001", "65000000", "00000001"],
}));
if (!("error" in accepted) || accepted.result !== true) throw new Error("share was not accepted");

proxy.retireJob("job-1");
const retired = await b.bridge.handleLine(JSON.stringify({ id: 4, method: "mining.subscribe", params: [] }));
if (!("error" in retired) || retired.error !== null) throw new Error("second session subscribe failed");

if (proxy.snapshot().acceptedShares !== 1) throw new Error("accepted share accounting incorrect");
proxy.closeSession("session-b");
proxy.stop();
if (proxy.snapshot().state !== "stopped" || proxy.snapshot().downstreamSessions !== 0) throw new Error("proxy stop failed");

console.log("mining proxy runtime tests passed");
