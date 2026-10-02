import http from "node:http";
import net from "node:net";
import { CgMinerAdapter, HttpPoolAdapter, BitcoinAddressWalletAdapter } from "../src/integrations";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const cgServer = net.createServer(socket => {
  socket.setEncoding("utf8");
  socket.on("data", () => {
    socket.end(JSON.stringify({
      STATUS: [{ STATUS: "S", Msg: "Summary" }],
      SUMMARY: [{ "GHS av": 1000, Accepted: 10, Rejected: 1, Temperature: 55, Power: 3200 }]
    }));
  });
});
await new Promise<void>(resolve => cgServer.listen(0, "127.0.0.1", resolve));
const cgPort = (cgServer.address() as net.AddressInfo).port;
const miner = new CgMinerAdapter({ host: "127.0.0.1", port: cgPort, username: "x", password: "y" });
await miner.connect();
const minerTelemetry = await miner.getTelemetry();
assert(minerTelemetry.hashrateHps === 1_000_000_000_000, "miner hashrate conversion failed");
assert(minerTelemetry.acceptedShares === 10, "miner shares failed");
await miner.disconnect();
await new Promise<void>(resolve => cgServer.close(() => resolve()));

const api = http.createServer((req, res) => {
  res.setHeader("content-type", "application/json");
  if (req.url === "/pool") {
    res.end(JSON.stringify({ reportedHashrateHps: 123, acceptedShares: 4, rejectedShares: 1 }));
    return;
  }
  res.end(JSON.stringify({
    chain_stats: { funded_txo_sum: 1000, spent_txo_sum: 200 },
    mempool_stats: { funded_txo_sum: 50, spent_txo_sum: 10 }
  }));
});
await new Promise<void>(resolve => api.listen(0, "127.0.0.1", resolve));
const port = (api.address() as net.AddressInfo).port;
const pool = new HttpPoolAdapter({ telemetryUrl: `http://127.0.0.1:${port}/pool`, poolId: "pool", endpoint: "stratum+tcp://pool.invalid:3333" });
await pool.connect();
assert((await pool.getTelemetry()).reportedHashrateHps === 123, "pool telemetry failed");

const wallet = new BitcoinAddressWalletAdapter({
  address: "bc1qtest",
  network: "bitcoin-mainnet",
  apiBaseUrl: `http://127.0.0.1:${port}`
});
const walletStatus = await wallet.getStatus();
assert(walletStatus.confirmedSats === 800, "wallet confirmed balance failed");
assert(walletStatus.pendingSats === 40, "wallet pending balance failed");
await new Promise<void>(resolve => api.close(() => resolve()));

console.log("real external adapter integration tests passed");
