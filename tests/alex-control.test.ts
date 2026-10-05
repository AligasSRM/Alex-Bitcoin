import { AlexControlBoundary } from "../src/services/alex-control";
import { ProductionMiningControl } from "../src/services/production-mining-control";

let minerConnected = false;
let poolConnected = false;
let mining = false;

const miner = {
  async connect() { minerConnected = true; },
  async disconnect() { minerConnected = false; },
  async getTelemetry() {
    return {
      minerId: "ASIC-TEST",
      model: "CGMiner-compatible ASIC",
      connection: minerConnected ? "connected" as const : "disconnected" as const,
      hashrateHps: mining ? 100_000_000_000_000 : 1,
      temperatureC: 60,
      powerWatts: 3000,
      acceptedShares: mining ? 4 : 0,
      rejectedShares: 0,
      observedAt: new Date().toISOString(),
    };
  },
  async startMining() {
    if (!minerConnected) throw new Error("miner not connected");
    mining = true;
  },
  async stopMining() {
    mining = false;
  },
};

const pool = {
  async connect() { poolConnected = true; },
  async disconnect() { poolConnected = false; },
  async getTelemetry() {
    return {
      poolId: "POOL-TEST",
      endpoint: "stratum+tcp://pool.example:3333",
      connection: poolConnected ? "connected" as const : "disconnected" as const,
      reportedHashrateHps: mining ? 100_000_000_000_000 : 1,
      acceptedShares: mining ? 4 : 0,
      rejectedShares: 0,
      observedAt: new Date().toISOString(),
    };
  },
};

const wallet = {
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
};

const core = {
  miner,
  pool,
  wallet,
  profitabilityInput: {
    electricityPricePerKwh: 0.1,
    btcPriceUsd: 100_000,
    networkDifficulty: 1,
    blockRewardBtc: 3.125,
  },
};

const boundary = new AlexControlBoundary({
  core,
  productionControl: new ProductionMiningControl({ miner, pool, wallet }),
});

const before = await boundary.execute("inspect");
if (!before.capabilities.inspect || !before.capabilities.startMining || !before.capabilities.stopMining) {
  throw new Error("Alex control capabilities were not exposed correctly");
}

const started = await boundary.execute("start_mining");
if (!started.ok || started.command !== "start_mining" || started.snapshot.state === "error") {
  throw new Error("Alex control start command failed");
}
if (!minerConnected || !poolConnected || !mining) {
  throw new Error("Alex control start did not reach the runtime");
}

const stopped = await boundary.execute("stop_mining");
if (!stopped.ok || stopped.command !== "stop_mining" || stopped.snapshot.state === "error") {
  throw new Error("Alex control stop command failed");
}
if (minerConnected || poolConnected || mining) {
  throw new Error("Alex control stop did not disconnect the runtime");
}

const blocked = new AlexControlBoundary({
  core: {
    ...core,
    miner: {
      ...miner,
      async startMining() { throw new Error("should not be reached"); },
      async getTelemetry() {
        throw new Error("telemetry unavailable");
      },
    },
  },
  productionControl: new ProductionMiningControl({
    miner: {
      ...miner,
      async startMining() { throw new Error("start unavailable"); },
    },
    pool,
    wallet,
  }),
});

const failed = await blocked.execute("start_mining");
if (failed.ok || failed.command !== "start_mining" || !failed.reason) {
  throw new Error("Alex control failure was not surfaced fail-closed");
}

console.log("Alex control boundary tests passed");
