import { loadConfig } from "../src/core/config";
import { assertNonNegativeFinite, assertPositiveFinite } from "../src/core/validation";

const validEnv = {
  APP_ENV: "test",
  API_PORT: "8080",
  MINER_HOST: "127.0.0.1",
  MINER_USERNAME: "worker",
  MINER_PASSWORD: "secret",
  POOL_URL: "stratum+tcp://pool.example:3333",
  POOL_USER: "wallet.worker",
  POOL_PASSWORD: "x",
  BTC_PAYOUT_ADDRESS: "bc1qexample",
};

const config = loadConfig(validEnv);
if (config.env !== "test" || config.apiPort !== 8080) throw new Error("config test failed");

let rejected = false;
try {
  loadConfig({ ...validEnv, MINER_HOST: "" });
} catch {
  rejected = true;
}
if (!rejected) throw new Error("missing secret/config was not rejected");

assertPositiveFinite(1, "hashrate");
assertNonNegativeFinite(0, "electricityCost");

console.log("core tests passed");
