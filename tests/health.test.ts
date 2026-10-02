import { collectCoreHealthSnapshot } from "../src/core/health";

const deps = {
  miner: {
    async connect() {},
    async disconnect() {},
    async getTelemetry() { throw new Error("miner offline"); },
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
  profitabilityInput: {
    hashrateHps: 1,
    powerWatts: 1,
    btcPriceUsd: 100_000,
    btcPerHash: 1e-12,
    electricityUsdPerKwh: 0.1,
  },
};

const snapshot = await collectCoreHealthSnapshot(deps);
if (snapshot.miner !== null) throw new Error("failed miner must be null");
if (!snapshot.pool || !snapshot.wallet) throw new Error("healthy services were lost");
if (snapshot.profitability !== null) throw new Error("profitability must fail closed");
if (!snapshot.alerts.some((alert) => alert.code === "MINER_UNAVAILABLE")) {
  throw new Error("miner alert missing");
}

console.log("fail-safe core health tests passed");
