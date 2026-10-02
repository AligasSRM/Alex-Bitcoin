import { sha256d } from "../mining/sha256d";
import type { MiningWork } from "../mining/types";
import type { StratumV1Job } from "./stratum-v1-upstream";

const DIFF1_TARGET = BigInt("0x00000000ffff0000000000000000000000000000000000000000000000000000");

function hex(value: string, bytes: number): Uint8Array {
  if (!new RegExp("^[0-9a-fA-F]{" + (bytes * 2) + "}$").test(value)) {
    throw new Error("invalid hex field");
  }
  return new Uint8Array(Buffer.from(value, "hex"));
}

function reverse4ByteWords(bytes: Uint8Array): Uint8Array {
  if (bytes.length !== 32) throw new Error("prevhash must be 32 bytes");
  const out = new Uint8Array(32);
  for (let i = 0; i < 8; i += 1) {
    const src = bytes.subarray((7 - i) * 4, (8 - i) * 4);
    out.set(src, i * 4);
  }
  return out;
}

function reverseBytes(bytes: Uint8Array): Uint8Array {
  return Uint8Array.from(bytes).reverse();
}

function compactBitsToTargetHex(nbits: string): string {
  const raw = hex(nbits, 4);
  const compact = new DataView(raw.buffer).getUint32(0, false);
  const exponent = compact >>> 24;
  const mantissa = compact & 0x007fffff;
  const negative = (compact & 0x00800000) !== 0;
  if (negative || mantissa === 0 || exponent < 3 || exponent > 34) {
    throw new Error("invalid nbits compact target");
  }
  const target = BigInt(mantissa) * (BigInt(2) ** BigInt(8 * (exponent - 3)));
  if (target <= 0n || target >= (1n << 256n)) throw new Error("invalid target range");
  return target.toString(16).padStart(64, "0");
}

export function difficultyToTargetHex(difficulty: number): string {
  if (!Number.isFinite(difficulty) || difficulty <= 0) throw new Error("difficulty must be positive");
  const scaled = DIFF1_TARGET * 1_000_000_000_000_000_000n;
  const divisor = BigInt(Math.round(difficulty * 1_000_000_000_000_000_000));
  if (divisor <= 0n) throw new Error("difficulty precision underflow");
  const target = scaled / divisor;
  if (target <= 0n) throw new Error("difficulty target underflow");
  return target.toString(16).padStart(64, "0");
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function buildMerkleRoot(job: StratumV1Job, extranonce1: string, extranonce2: string): Uint8Array {
  const coinbase = hex(job.coinbase1, job.coinbase1.length / 2);
  const ex1 = hex(extranonce1, extranonce1.length / 2);
  const ex2 = hex(extranonce2, extranonce2.length / 2);
  const coinbaseSuffix = hex(job.coinbase2, job.coinbase2.length / 2);
  let root = sha256d(concat(coinbase, ex1, ex2, coinbaseSuffix));
  for (const branchHex of job.merkleBranches) {
    root = sha256d(concat(root, hex(branchHex, branchHex.length / 2)));
  }
  return root;
}

export interface StratumMiningWorkOptions {
  extranonce1: string;
  extranonce2: string;
  shareTargetHex: string;
  nonceStart?: number;
  nonceEnd?: number;
  createdAt?: string;
}

export function stratumJobToMiningWork(job: StratumV1Job, options: StratumMiningWorkOptions): MiningWork {
  if (!/^[0-9a-fA-F]+$/.test(options.extranonce2) || options.extranonce2.length % 2 !== 0) {
    throw new Error("invalid extranonce2");
  }
  if (options.extranonce2.length === 0) throw new Error("extranonce2 is required");
  if (options.extranonce2.length > 32) throw new Error("extranonce2 is too large");

  const version = reverseBytes(hex(job.version, 4));
  // Stratum V1 prevhash is transmitted as 8 little-endian 32-bit words.
  // Reversing word order yields the 32-byte little-endian block-header field.
  const prevhash = reverse4ByteWords(hex(job.prevHash, 32));
  const merkle = buildMerkleRoot(job, options.extranonce1, options.extranonce2);
  const ntime = reverseBytes(hex(job.ntime, 4));
  const nbits = reverseBytes(hex(job.nbits, 4));
  const headerPrefix76 = concat(version, prevhash, merkle, ntime, nbits);

  if (headerPrefix76.length !== 76) throw new Error("constructed Stratum header prefix must be 76 bytes");
  if (!/^[0-9a-fA-F]{64}$/.test(options.shareTargetHex)) throw new Error("shareTargetHex must be 32-byte hex");

  const nonceStart = options.nonceStart ?? 0;
  const nonceEnd = options.nonceEnd ?? 0xffffffff;
  if (!Number.isInteger(nonceStart) || !Number.isInteger(nonceEnd) || nonceStart < 0 || nonceEnd < nonceStart || nonceEnd > 0xffffffff) {
    throw new Error("invalid nonce range");
  }

  return {
    jobId: job.jobId,
    headerPrefix76,
    nonceStart,
    nonceEnd,
    targetHex: options.shareTargetHex.toLowerCase(),
    createdAt: options.createdAt ?? new Date().toISOString(),
  };
}

export function stratumNetworkTargetHex(job: StratumV1Job): string {
  return compactBitsToTargetHex(job.nbits);
}

export function stratumDifficulty1TargetHex(): string {
  return DIFF1_TARGET.toString(16).padStart(64, "0");
}
