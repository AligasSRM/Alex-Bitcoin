import { validatePoolTelemetry } from "../src/modules/pool";

const telemetry = {
  poolId: "TEST-POOL",
  endpoint: "stratum+tcp://test.invalid:3333",
  connection: "connected" as const,
  reportedHashrateHps: 100_000_000_000_000,
  acceptedShares: 42,
  rejectedShares: 1,
  observedAt: new Date().toISOString(),
};

validatePoolTelemetry(telemetry);

let rejected = false;
try {
  validatePoolTelemetry({ ...telemetry, rejectedShares: -1 });
} catch {
  rejected = true;
}

if (!rejected) throw new Error("invalid rejected share count was not rejected");

console.log("pool core tests passed");
