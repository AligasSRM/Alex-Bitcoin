import { createHealthPoller } from "../src/services/health-poll";

const deps = {
  miner: {
    async connect() {},
    async disconnect() {},
    async getTelemetry() {
      return {
        minerId: "TEST-MINER",
        model: "TEST-MODEL",
        connection: "connected" as const,
        hashrateHps: 100,
        temperatureC: 60,
        powerWatts: 1000,
        acceptedShares: 10,
        rejectedShares: 0,
        observedAt: new Date().toISOString(),
      };
    },
  },
  pool: {
    async connect() {},
    async disconnect() {},
    async getTelemetry() {
      return {
        poolId: "TEST-POOL",
        endpoint: "stratum+tcp://test.invalid:3333",
        connection: "connected" as const,
        reportedHashrateHps: 100,
        acceptedShares: 10,
        rejectedShares: 0,
        observedAt: new Date().toISOString(),
      };
    },
  },
  wallet: {
    async getStatus() {
      return {
        walletId: "TEST-WALLET",
        network: "bitcoin-testnet" as const,
        payoutAddress: "TEST_ADDRESS",
        confirmedSats: 0,
        pendingSats: 0,
        observedAt: new Date().toISOString(),
      };
    },
  },
  profitabilityInput: {
    hashrateHps: 1,
    powerWatts: 1,
    btcPriceUsd: 100_000,
    btcPerHash: 1e-12,
    electricityUsdPerKwh: 0.1,
  },
};

const poller = createHealthPoller(deps, { intervalMs: 0, attempts: 1, delayMs: 0 });
const snapshot = await poller.poll();
if (!snapshot.miner || !snapshot.pool || !snapshot.wallet) throw new Error("health poll failed");

let scheduledCalls = 0;
let active = 0;
let maxActive = 0;
const slowDeps = {
  ...deps,
  miner: { ...deps.miner, async getTelemetry() {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise<void>((resolve) => setTimeout(resolve, 15));
    active -= 1;
    return deps.miner.getTelemetry();
  }},
};
const overlapPoller = createHealthPoller(slowDeps, { intervalMs: 5, attempts: 1, delayMs: 0 });
overlapPoller.start(() => {});
await new Promise<void>((resolve) => setTimeout(resolve, 35));
overlapPoller.stop();
if (maxActive > 1) throw new Error("health polls overlapped");

const scheduledPoller = createHealthPoller(deps, { intervalMs: 10, attempts: 1, delayMs: 0 });
scheduledPoller.start(() => { scheduledCalls += 1; });
await new Promise<void>((resolve) => setTimeout(resolve, 25));
scheduledPoller.stop();
if (scheduledCalls < 1) throw new Error("scheduled polling did not execute");

poller.stop();
let stopped = false;
try {
  await poller.poll();
} catch {
  stopped = true;
}
if (!stopped) throw new Error("stopped poller accepted polling");

console.log("health polling tests passed");
