import { toDashboardRuntimeSnapshot } from "../src/dashboard/core-runtime-bridge";

const snapshot = toDashboardRuntimeSnapshot({
  collectedAt: "2026-10-03T00:00:00.000Z",
  miner: {
    minerId: "asic-1",
    model: "CGMiner-compatible ASIC",
    connection: "connected",
    hashrateHps: 125000000000000,
    temperatureC: 61,
    powerWatts: 3200,
    acceptedShares: 9,
    rejectedShares: 1,
    observedAt: "2026-10-03T00:00:01.000Z",
  },
  pool: {
    poolId: "pool-1",
    endpoint: "stratum+tcp://pool.example:3333",
    connection: "connected",
    reportedHashrateHps: 124000000000000,
    acceptedShares: 9,
    rejectedShares: 1,
    observedAt: "2026-10-03T00:00:02.000Z",
  },
  wallet: {
    walletId: "wallet-1",
    network: "bitcoin-mainnet",
    payoutAddress: "bc1example",
    confirmedSats: 0,
    pendingSats: 0,
    observedAt: "2026-10-03T00:00:03.000Z",
  },
  profitability: {} as any,
  alerts: [],
});

if (snapshot.state !== "ready") throw new Error("dashboard bridge state failed");
if (snapshot.miner.hashrate !== 125000000000000) throw new Error("dashboard bridge hashrate failed");
if (snapshot.miner.efficiencyJPerTH !== 25.6) throw new Error("dashboard bridge efficiency failed");
if (snapshot.pool.host !== "pool.example" || snapshot.pool.port !== 3333) throw new Error("dashboard bridge endpoint failed");
if (snapshot.shares.accepted !== 9 || snapshot.shares.rejected !== 1) throw new Error("dashboard bridge shares failed");
if (!snapshot.wallet.configured || snapshot.wallet.address !== "bc1example") throw new Error("dashboard bridge wallet failed");
if (snapshot.financial.verified) throw new Error("dashboard bridge must not verify finance");

console.log("dashboard core bridge tests passed");
