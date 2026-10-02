import { StratumMiningBridge } from "../src/modules/pool/bridge";
import { MiningAuditLog } from "../src/modules/mining/audit";

const audit = new MiningAuditLog();
const bridge = new StratumMiningBridge({
  extranonce1: "01020304",
  extranonce2Size: 4,
  authorize: async (worker, password) => worker === "rig-1" && password === "x",
  audit,
});

bridge.registerJob({
  jobId: "job-1",
  headerPrefix76: new Uint8Array(76),
  nonceStart: 0,
  nonceEnd: 10,
  targetHex: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  createdAt: new Date().toISOString(),
});

const subscribed = await bridge.handleLine(JSON.stringify({ id: 1, method: "mining.subscribe", params: [] }));
if (!("error" in subscribed) || subscribed.error !== null) throw new Error("subscribe failed");

const authorized = await bridge.handleLine(JSON.stringify({ id: 2, method: "mining.authorize", params: ["rig-1", "x"] }));
if (!("error" in authorized) || authorized.error !== null || authorized.result !== true) throw new Error("authorize failed");

const accepted = await bridge.handleLine(JSON.stringify({
  id: 3,
  method: "mining.submit",
  params: ["rig-1", "job-1", "00000001", "65000000", "00000001"],
}));
if (!("error" in accepted) || accepted.error !== null || accepted.result !== true) throw new Error("submit bridge failed");

bridge.session.setDifficulty(9000);
const targetRejected = await bridge.handleLine(JSON.stringify({
  id: 4,
  method: "mining.submit",
  params: ["rig-1", "job-1", "00000002", "65000000", "00000002"],
}));
if (!("error" in targetRejected) || targetRejected.error !== null || targetRejected.result !== false) {
  throw new Error("Stratum difficulty target was not enforced by the bridge");
}

const duplicate = await bridge.handleLine(JSON.stringify({
  id: 5,
  method: "mining.submit",
  params: ["rig-1", "job-1", "00000001", "65000000", "00000001"],
}));
if (!("error" in duplicate) || duplicate.error !== null || duplicate.result !== false) throw new Error("duplicate was accepted");

const stats = bridge.getStats();
if (stats.accepted !== 1 || stats.rejected !== 2 || stats.duplicates !== 1) throw new Error("share stats incorrect");
if (audit.snapshot().length !== 3) throw new Error("audit events missing");

console.log("stratum mining bridge tests passed");
