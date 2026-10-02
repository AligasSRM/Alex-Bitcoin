import { withRetry } from "../src/services/retry";

let calls = 0;
const value = await withRetry(async () => {
  calls += 1;
  if (calls < 2) throw new Error("transient");
  return "verified";
}, { attempts: 2, delayMs: 0 });

if (value !== "verified" || calls !== 2) throw new Error("retry success path failed");

let failures = 0;
try {
  await withRetry(async () => {
    failures += 1;
    throw new Error("persistent");
  }, { attempts: 3, delayMs: 0 });
} catch {
  if (failures !== 3) throw new Error("retry attempt count failed");
}

console.log("bounded retry tests passed");
