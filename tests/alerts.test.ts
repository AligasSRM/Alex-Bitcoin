import { createAlert } from "../src/modules/alerts";

const alert = createAlert({
  source: "miner",
  severity: "critical",
  code: "MINER_OFFLINE",
  message: "Miner connection is unavailable",
  observedAt: new Date().toISOString(),
});

if (!alert.id) throw new Error("alert id was not generated");
if (alert.severity !== "critical") throw new Error("alert severity failed");

let rejected = false;
try {
  createAlert({
    source: "miner",
    severity: "critical",
    code: "",
    message: "invalid",
    observedAt: new Date().toISOString(),
  });
} catch {
  rejected = true;
}
if (!rejected) throw new Error("invalid alert was not rejected");

console.log("alerts core tests passed");
