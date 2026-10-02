import { safeCall } from "../src/services";

const success = await safeCall(async () => "verified");
if (!success.ok || success.value !== "verified") {
  throw new Error("safeCall success path failed");
}

const failure = await safeCall(async () => {
  throw new Error("secret provider failure");
});
if (failure.ok || failure.code !== "UNAVAILABLE") {
  throw new Error("safeCall failure path failed");
}

const timeout = await safeCall(
  () => new Promise<string>((resolve) => setTimeout(() => resolve("too-late"), 25)),
  { timeoutMs: 5 },
);
if (timeout.ok || timeout.code !== "TIMEOUT") {
  throw new Error("safeCall timeout path failed");
}

console.log("service boundary tests passed");
