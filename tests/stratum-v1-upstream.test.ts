import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import type { MiningWork } from "../src/modules/mining/types";
import { StratumV1UpstreamClient, type StratumV1Job } from "../src/modules/pool/stratum-v1-upstream";

class FakeSocket extends EventEmitter {
  destroyed = false;
  timeoutMs = 0;
  setTimeout(ms: number, _handler: () => void) { this.timeoutMs = ms; }
  write(data: string, _encoding: string, cb: (error?: Error) => void) { this.lastWrite = data; cb(); }
  destroy() { this.destroyed = true; this.emit("close"); }
  lastWrite = "";
}

const socket = new FakeSocket();
const work: MiningWork = { jobId: "j1", headerPrefix76: new Uint8Array(76), nonceStart: 0, nonceEnd: 0xffffffff, targetHex: "f".repeat(64), createdAt: new Date().toISOString() };
let client!: StratumV1UpstreamClient;
let requestQueue: string[] = [];
const fake = socket as unknown as import("node:net").Socket;
client = new StratumV1UpstreamClient({
  host: "pool.example",
  port: 3333,
  workerName: "user.worker1",
  password: "x",
  socketFactory: () => fake,
  jobToMiningWork: (_job: StratumV1Job) => work,
});

const connectPromise = client.connect();
socket.emit("connect");
await new Promise((r) => setImmediate(r));
requestQueue.push(socket.lastWrite);
socket.emit("data", '{"id":1,"result":[[], "01020304", 4],"error":null}\n');
await new Promise((r) => setImmediate(r));
requestQueue.push(socket.lastWrite);
socket.emit("data", '{"id":2,"result":true,"error":null}\n');
await connectPromise;
assert.equal(client.getState(), "connected");
assert.equal(client.getExtranonce2Size(), 4);

let received = false;
client.onJob(() => { received = true; });
socket.emit("data", '{"id":99,"method":"mining.notify","params":["j1","00","aa","bb",[],"20000000","1d00ffff","65000000",true]}\n');
assert.equal(received, true);

const sharePromise = client.submitShare({workerId:"user.worker1",jobId:"j1",extranonce2:"00000001",ntime:"65000000",nonce:"00000001"});
await new Promise((r) => setImmediate(r));
socket.emit("data", '{"id":3,"result":true,"error":null}\n');
assert.equal(await sharePromise, true);

await client.disconnect();
assert.equal(client.getState(), "disconnected");
console.log("real Stratum V1 upstream client tests passed");
