import { MiningControlBoundary } from "../src/services/mining-control";

let started = false;
let stopped = false;

const miner = {
  async connect() {},
  async disconnect() {},
  async getTelemetry() {
    return {} as any;
  },
  async startMining() {
    started = true;
  },
  async stopMining() {
    stopped = true;
  },
};

const control = new MiningControlBoundary(miner);
const start = await control.start();
if (!start.ok || start.state !== "mining" || !started) {
  throw new Error("mining start control failed");
}

const duplicate = await control.start();
if (duplicate.ok || duplicate.reason !== "already_running") {
  throw new Error("duplicate start was not rejected");
}

const stop = await control.stop();
if (!stop.ok || stop.state !== "stopped" || !stopped) {
  throw new Error("mining stop control failed");
}

const unavailable = new MiningControlBoundary({
  async connect() {},
  async disconnect() {},
  async getTelemetry() { return {} as any; },
});
const blocked = await unavailable.start();
if (blocked.ok || blocked.reason !== "miner_start_control_unavailable") {
  throw new Error("missing miner control was not fail-closed");
}

console.log("mining control boundary tests passed");
