import type { MiningWork } from "./types";

export function validateMiningWork(work: MiningWork): void {
  if (!work.jobId.trim()) throw new Error("jobId must not be empty");
  if (work.headerPrefix76.byteLength !== 76) throw new Error("headerPrefix76 must be exactly 76 bytes");
  if (!Number.isInteger(work.nonceStart) || work.nonceStart < 0 || work.nonceStart > 0xffffffff) {
    throw new Error("nonceStart must be an unsigned 32-bit integer");
  }
  if (!Number.isInteger(work.nonceEnd) || work.nonceEnd < 0 || work.nonceEnd > 0xffffffff) {
    throw new Error("nonceEnd must be an unsigned 32-bit integer");
  }
  if (work.nonceEnd < work.nonceStart) throw new Error("nonceEnd must be >= nonceStart");
  if (!/^[0-9a-fA-F]{64}$/.test(work.targetHex)) throw new Error("targetHex must be a 32-byte hex value");
  if (Number.isNaN(Date.parse(work.createdAt))) throw new Error("createdAt must be a valid ISO timestamp");
}

export function nonceInWorkRange(work: MiningWork, nonce: number): boolean {
  return Number.isInteger(nonce) && nonce >= work.nonceStart && nonce <= work.nonceEnd;
}
