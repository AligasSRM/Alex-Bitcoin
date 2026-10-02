import { validateMinerTelemetry } from "../src/modules/miner";

const telemetry = {
  minerId: "asic-001",
  model: "UNKNOWN_REAL_MODEL",
  connection: "connected" as const,
  hashrateHps: 100_000_000_000_000,
  temperatureC: 65,
  powerWatts: 3200,
  acceptedShares: 120,
  rejectedShares: 2,
  observedAt: new Date().toISOString(),
};

validateMinerTelemetry(telemetry);

let rejected = false;
try {
  validateMinerTelemetry({ ...telemetry, hashrateHps: 0 });
} catch {
  rejected = true;
}

if (!rejected) throw new Error("invalid hashrate was not rejected");

console.log("miner core tests passed");
