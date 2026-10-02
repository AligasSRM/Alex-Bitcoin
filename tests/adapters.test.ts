import { createExternalAdapters } from "../src/services/adapters";

const adapters = createExternalAdapters({
  miner: {
    async connect() {},
    async disconnect() {},
    async getTelemetry() {
      return {
        minerId: "TEST-MINER",
        model: "TEST-MODEL",
        connection: "connected" as const,
        hashrateHps: 1,
        temperatureC: 1,
        powerWatts: 1,
        acceptedShares: 1,
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
        reportedHashrateHps: 1,
        acceptedShares: 1,
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
});

if (!adapters.miner || !adapters.pool || !adapters.wallet) {
  throw new Error("adapter contract failed");
}

let rejected = false;
try {
  createExternalAdapters({ miner: undefined as never, pool: adapters.pool, wallet: adapters.wallet });
} catch {
  rejected = true;
}
if (!rejected) throw new Error("missing adapter must be rejected");

console.log("external adapter contract tests passed");
