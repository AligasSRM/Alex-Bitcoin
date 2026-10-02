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

console.log("service boundary tests passed");
