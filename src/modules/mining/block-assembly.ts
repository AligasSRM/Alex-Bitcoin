import { sha256d } from "./sha256d";

export interface BitcoinBlockHeaderFields {
  version: number;
  previousBlockHashHex: string;
  merkleRootHex: string;
  time: number;
  bits: number;
  nonce: number;
}

export interface BitcoinBlockTemplateData {
  header: BitcoinBlockHeaderFields;
  coinbaseTransactionHex: string;
  transactionHexes?: string[];
}

export interface AssembledBitcoinBlock {
  headerHex: string;
  merkleRootHex: string;
  transactionCount: number;
  blockHex: string;
}

function hexBytes(value: string, expectedBytes?: number): Uint8Array {
  if (!/^[0-9a-fA-F]*$/.test(value) || value.length % 2 !== 0) throw new Error("invalid hex");
  const bytes = new Uint8Array(Buffer.from(value, "hex"));
  if (expectedBytes !== undefined && bytes.length !== expectedBytes) throw new Error("invalid hex length");
  return bytes;
}

function reverseBytes(bytes: Uint8Array): Uint8Array {
  return Uint8Array.from(bytes).reverse();
}

function uint32le(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error("uint32 out of range");
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value, true);
  return out;
}

function encodeCompactSize(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0) throw new Error("compact size out of range");
  if (value < 0xfd) return Uint8Array.of(value);
  if (value <= 0xffff) return Uint8Array.of(0xfd, value & 0xff, value >>> 8);
  if (value <= 0xffffffff) return Uint8Array.of(0xfe, value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, value >>> 24);
  throw new Error("compact size too large");
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function transactionIdHex(transactionHex: string): string {
  const transaction = hexBytes(transactionHex);
  if (transaction.length === 0) throw new Error("transaction must not be empty");
  return Buffer.from(sha256d(transaction)).reverse().toString("hex");
}

export function merkleRootHex(transactionHexes: string[]): string {
  if (transactionHexes.length === 0) throw new Error("at least one transaction is required");
  let layer = transactionHexes.map((tx) => sha256d(hexBytes(tx)));
  while (layer.length > 1) {
    const next: Uint8Array[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const right = layer[i + 1] ?? layer[i];
      next.push(sha256d(concat(layer[i], right)));
    }
    layer = next;
  }
  return Buffer.from(layer[0]).reverse().toString("hex");
}

export function serializeBitcoinBlockHeader(fields: BitcoinBlockHeaderFields): Uint8Array {
  const previous = reverseBytes(hexBytes(fields.previousBlockHashHex, 32));
  const merkle = reverseBytes(hexBytes(fields.merkleRootHex, 32));
  return concat(
    uint32le(fields.version),
    previous,
    merkle,
    uint32le(fields.time),
    uint32le(fields.bits),
    uint32le(fields.nonce),
  );
}

export function assembleBitcoinBlock(template: BitcoinBlockTemplateData): AssembledBitcoinBlock {
  const transactions = [template.coinbaseTransactionHex, ...(template.transactionHexes ?? [])];
  const merkleRoot = merkleRootHex(transactions);
  if (merkleRoot.toLowerCase() !== template.header.merkleRootHex.toLowerCase()) {
    throw new Error("merkle root does not match block transactions");
  }
  const header = serializeBitcoinBlockHeader(template.header);
  const block = concat(header, encodeCompactSize(transactions.length), ...transactions.map(hexBytes));
  return {
    headerHex: Buffer.from(header).toString("hex"),
    merkleRootHex: merkleRoot,
    transactionCount: transactions.length,
    blockHex: Buffer.from(block).toString("hex"),
  };
}
