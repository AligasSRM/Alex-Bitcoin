import { connectExternalAdapters, disconnectExternalAdapters } from "../src/services/lifecycle";

let minerConnected = false;
let poolConnected = false;
let minerDisconnected = false;
let poolDisconnected = false;

const adapters = {
  miner: {
    async connect() { minerConnected = true; },
    async disconnect() { minerDisconnected = true; minerConnected = false; },
    async getTelemetry() { throw new Error("not called"); },
  },
  pool: {
    async connect() { poolConnected = true; },
    async disconnect() { poolDisconnected = true; poolConnected = false; },
    async getTelemetry() { throw new Error("not called"); },
  },
  wallet: {
    async getStatus() {
      return {
        walletId: "TEST-WALLET",
        network: "bitcoin-testnet" as const,
        payoutAddress: "TEST_ADDRESS",
        confirmedSats: 0,
        pendingSats: 0,
        observedAt: new Date().toISOString(),
      };
    },
  },
};

const result = await connectExternalAdapters(adapters);
if (!result.ok || !result.connected.miner || !result.connected.pool || !result.connected.wallet) {
  throw new Error("adapter lifecycle connect failed");
}
if (!minerConnected || !poolConnected) throw new Error("adapters were not connected");

await disconnectExternalAdapters(adapters);
if (!minerDisconnected || !poolDisconnected || minerConnected || poolConnected) {
  throw new Error("adapter lifecycle disconnect failed");
}

let rollbackPoolDisconnected = false;
const failingAdapters = {
  ...adapters,
  pool: {
    ...adapters.pool,
    async connect() { throw new Error("pool unavailable"); },
    async disconnect() { rollbackPoolDisconnected = true; },
  },
};

const failed = await connectExternalAdapters(failingAdapters);
if (failed.ok || !failed.connected || !minerDisconnected) {
  throw new Error("failed lifecycle was not fail-closed");
}
if (!failingAdapters.miner || rollbackPoolDisconnected) {
  throw new Error("rollback behavior invalid");
}

console.log("external adapter lifecycle tests passed");
