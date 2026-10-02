import { MiningWorkerRegistry } from "../src/modules/pool/workers";

const registry = new MiningWorkerRegistry();

const created = registry.register({
  workerId: "worker-a",
  workerName: "alice.asic01",
  accountId: "account-alice",
  deviceId: "asic-01",
});

if (created.state !== "offline" || created.hashrateHps !== 0) throw new Error("worker defaults incorrect");

registry.setState("worker-a", "online");
registry.setHashrate("worker-a", 125_000_000_000);
registry.recordShare("worker-a", { accepted: 7, rejected: 2, duplicates: 1, stale: 3 });

const worker = registry.get("worker-a");
if (
  !worker ||
  worker.state !== "online" ||
  worker.hashrateHps !== 125_000_000_000 ||
  worker.acceptedShares !== 7 ||
  worker.rejectedShares !== 2 ||
  worker.duplicateShares !== 1 ||
  worker.staleShares !== 3 ||
  !worker.lastSeenAt
) {
  throw new Error("worker runtime state was not tracked");
}

registry.register({ workerId: "worker-b", workerName: "bob.asic01", accountId: "account-bob" });
registry.setState("worker-b", "online");

const snapshot = registry.snapshot();
if (snapshot.totalWorkers !== 2 || snapshot.onlineWorkers !== 2) throw new Error("worker snapshot counts incorrect");

let duplicateRejected = false;
try {
  registry.register({ workerId: "worker-a", workerName: "duplicate" });
} catch {
  duplicateRejected = true;
}
if (!duplicateRejected) throw new Error("duplicate worker registration was accepted");

registry.unregister("worker-b");
if (registry.snapshot().totalWorkers !== 1) throw new Error("worker unregister failed");

console.log("mining worker registry tests passed");
