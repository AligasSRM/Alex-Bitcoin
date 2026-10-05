import { ProductionMiningControl } from "../src/services/production-mining-control";

let minerConnected = false;
let poolConnected = false;
let minerStarted = false;
let minerStopped = false;
let poolDisconnected = false;
let minerDisconnected = false;

const adapters = {
  miner: {
    async connect() { minerConnected = true; },
    async disconnect() { minerDisconnected = true; minerConnected = false; },
    async getTelemetry() { throw new Error("not called"); },
    async startMining() { if (!minerConnected) throw new Error("miner not connected"); minerStarted = true; },
    async stopMining() { minerStopped = true; minerStarted = false; },
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

const control = new ProductionMiningControl(adapters);
const started = await control.start();

if (!started.ok || started.state !== "mining") {
  throw new Error("production start did not reach mining state");
}
if (!minerConnected || !poolConnected || !minerStarted) {
  throw new Error("production start did not bind lifecycle to miner control");
}

const stopped = await control.stop();
if (!stopped.ok || stopped.state !== "stopped") {
  throw new Error("production stop did not reach stopped state");
}
if (!minerStopped || !minerDisconnected || !poolDisconnected || minerConnected || poolConnected) {
  throw new Error("production stop did not disconnect external runtime");
}

let failedStartDisconnect = false;
const failingAdapters = {
  ...adapters,
  miner: {
    ...adapters.miner,
    async startMining() { throw new Error("start failed"); },
    async disconnect() { failedStartDisconnect = true; },
  },
};

const failedControl = new ProductionMiningControl(failingAdapters);
const failed = await failedControl.start();
if (failed.ok || failed.state !== "error" || !failedStartDisconnect) {
  throw new Error("failed production start was not rolled back fail-closed");
}

console.log("production mining control tests passed");
