import { validateStartupGate } from "../src/services/startup-gate";

const baseConfig = {
  env: "production" as const,
  apiPort: 8080,
  miner: { host: "miner.local", username: "user", password: "secret" },
  pool: { url: "stratum+tcp://pool.local:3333", user: "worker", password: "secret" },
  wallet: { btcPayoutAddress: "bc1q-production-test-address" },
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

validateStartupGate({ config: baseConfig, adapters, profitabilityInput });

let rejected = false;
try {
  validateStartupGate({
    config: { ...baseConfig, wallet: { btcPayoutAddress: "" } },
    adapters,
    profitabilityInput,
  });
} catch {
  rejected = true;
}
if (!rejected) throw new Error("startup gate accepted missing production payout address");

console.log("startup gate tests passed");
