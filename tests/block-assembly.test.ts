import { assembleBitcoinBlock, merkleRootHex, serializeBitcoinBlockHeader, transactionIdHex } from "../src/modules/mining/block-assembly";

const coinbase = "01000000";
const tx = "02000000";
const transactions = [coinbase, tx];

const coinbaseId = transactionIdHex(coinbase);
if (coinbaseId.length !== 64) throw new Error("coinbase txid must be 32 bytes");

const root = merkleRootHex(transactions);
if (root.length !== 64) throw new Error("merkle root must be 32 bytes");

const header = serializeBitcoinBlockHeader({
  version: 1,
  previousBlockHashHex: "00".repeat(32),
  merkleRootHex: root,
  time: 1231006505,
  bits: 0x1d00ffff,
  nonce: 2083236893,
});
if (header.length !== 80) throw new Error("block header must be 80 bytes");
if (Buffer.from(header.slice(0, 4)).toString("hex") !== "01000000") throw new Error("version serialization failed");
if (Buffer.from(header.slice(4, 36)).toString("hex") !== "00".repeat(32)) throw new Error("previous hash serialization failed");
if (Buffer.from(header.slice(72, 76)).toString("hex") !== "ffff001d") throw new Error("bits serialization failed");
if (Buffer.from(header.slice(76, 80)).toString("hex") !== "1dac2b7c") throw new Error("nonce serialization failed");

const assembled = assembleBitcoinBlock({
  header: {
    version: 1,
    previousBlockHashHex: "00".repeat(32),
    merkleRootHex: root,
    time: 1231006505,
    bits: 0x1d00ffff,
    nonce: 2083236893,
  },
  coinbaseTransactionHex: coinbase,
  transactionHexes: [tx],
});
if (assembled.transactionCount !== 2) throw new Error("transaction count failed");
if (!assembled.blockHex.startsWith(assembled.headerHex)) throw new Error("block must start with header");
if (assembled.blockHex.slice(160, 162) !== "02") throw new Error("transaction count varint failed");

let mismatchRejected = false;
try {
  assembleBitcoinBlock({
    header: {
      version: 1,
      previousBlockHashHex: "00".repeat(32),
      merkleRootHex: "11".repeat(32),
      time: 1231006505,
      bits: 0x1d00ffff,
      nonce: 0,
    },
    coinbaseTransactionHex: coinbase,
  });
} catch {
  mismatchRejected = true;
}
if (!mismatchRejected) throw new Error("merkle mismatch must fail closed");

console.log("block assembly tests passed");
