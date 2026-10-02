import assert from "node:assert/strict";
import { BitcoinCoreRpcClient } from "../src/modules/mining/bitcoin-core-rpc";

const calls: Array<{ method: string; body: string; auth: string }> = [];
const fakeFetch: typeof fetch = async (_input, init) => {
  const body = String(init?.body ?? "");
  const headers = new Headers(init?.headers);
  const request = JSON.parse(body) as { method: string };
  calls.push({ method: request.method, body, auth: headers.get("authorization") ?? "" });
  if (request.method === "getblocktemplate") {
    return new Response(JSON.stringify({
      result: {
        version: 1,
        previousblockhash: "00".repeat(32),
        transactions: [{ data: "01000000" }],
        coinbasetxn: { data: "02000000" },
        target: "ff".repeat(32),
        bits: "1d00ffff",
        curtime: 1234567890,
      },
      error: null,
      id: 1,
    }), { status: 200 });
  }
  if (request.method === "submitblock") {
    return new Response(JSON.stringify({ result: null, error: null, id: 1 }), { status: 200 });
  }
  return new Response(JSON.stringify({ result: null, error: null, id: 1 }), { status: 200 });
};

const client = new BitcoinCoreRpcClient({
  url: "http://127.0.0.1:18443",
  username: "regtest",
  password: "secret",
  fetchImpl: fakeFetch,
});

const template = await client.getBlockTemplate();
assert.equal(template.headerPrefix76.length, 76);
assert.equal(template.targetHex.length, 64);
assert.equal(calls[0].method, "getblocktemplate");
assert.equal(calls[0].auth, `Basic ${Buffer.from("regtest:secret").toString("base64")}`);

const accepted = await client.submitBlock("00".repeat(80));
assert.equal(accepted, "accepted");
assert.equal(calls[1].method, "submitblock");

const rejectingFetch: typeof fetch = async () =>
  new Response(JSON.stringify({ result: "bad-blk", error: null, id: 1 }), { status: 200 });
const rejectingClient = new BitcoinCoreRpcClient({
  url: "http://127.0.0.1:18443",
  username: "regtest",
  password: "secret",
  fetchImpl: rejectingFetch,
});
assert.equal(await rejectingClient.submitBlock("00".repeat(80)), "rejected");

console.log("bitcoin core RPC regtest boundary tests passed");
