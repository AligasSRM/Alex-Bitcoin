import { collectCoreSnapshot } from "../src/core/application";

const miner = {
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
};

const pool = {
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
};

const wallet = {
  async getStatus() {
    return {
      walletId: "TEST-WALLET",
      network: "bitcoin-testnet" as const,
      payoutAddress: "TEST_ADDRESS",
      confirmedSats: 1000,
      pendingSats: 0,
      observedAt: new Date().toISOString(),
    };
  },
};

const snapshot = await collectCoreSnapshot({
  miner,
  pool,
  wallet,
  profitabilityInput: {
    hashrateHps: 1,
    powerWatts: 1,
    btcPriceUsd: 100_000,
    btcPerHash: 1e-9,
    electricityUsdPerKwh: 0.1,
  },
});

if (snapshot.miner.minerId !== "TEST-MINER") throw new Error("miner integration failed");
if (snapshot.pool.poolId !== "TEST-POOL") throw new Error("pool integration failed");
if (snapshot.wallet.walletId !== "TEST-WALLET") throw new Error("wallet integration failed");
if (snapshot.profitability.dailyBtc <= 0) throw new Error("profitability integration failed");

console.log("core integration tests passed");
