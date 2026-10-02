import { createRuntime } from "../src/services/runtime";

const config = {
  env: "test" as const,
  apiPort: 8080,
  miner: { host: "test", username: "test", password: "test" },
  pool: { url: "test", user: "test", password: "test" },
  wallet: { btcPayoutAddress: "TEST_ADDRESS" },
};

const adapters = {
  miner: { async connect() {}, async disconnect() {}, async getTelemetry() { throw new Error("not called"); } },
  pool: { async connect() {}, async disconnect() {}, async getTelemetry() { throw new Error("not called"); } },
  wallet: { async getStatus() { throw new Error("not called"); } },
};

const profitabilityInput = {
  hashrateHps: 1,
  powerWatts: 1,
  btcPriceUsd: 100_000,
  btcPerHash: 1e-12,
  electricityUsdPerKwh: 0.1,
};

const runtime = createRuntime(config, adapters, profitabilityInput);
if (runtime.config !== config) throw new Error("runtime config wiring failed");
if (runtime.core.miner !== adapters.miner) throw new Error("miner wiring failed");
if (runtime.core.pool !== adapters.pool) throw new Error("pool wiring failed");
if (runtime.core.wallet !== adapters.wallet) throw new Error("wallet wiring failed");
if (runtime.core.profitabilityInput !== profitabilityInput) throw new Error("profitability input wiring failed");

console.log("runtime wiring tests passed");
