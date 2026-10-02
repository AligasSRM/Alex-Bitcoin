import { hashHeader, hashMeetsTarget, hashToDisplayHex } from "./sha256d";
import { nonceInWorkRange, validateMiningWork } from "./validation";
import type { MiningWork } from "./types";

export type ShareRejectionReason =
  | "invalid_work"
  | "invalid_nonce"
  | "nonce_out_of_range"
  | "invalid_hash"
  | "target_not_met";

export interface MiningShare {
  jobId: string;
  workerId: string;
  nonce: number;
  hashHex?: string;
}

export interface ShareValidationResult {
  accepted: boolean;
  jobId: string;
  workerId: string;
  nonce: number;
  hashHex?: string;
  reason?: ShareRejectionReason;
}

export function validateMiningShare(work: MiningWork, share: MiningShare): ShareValidationResult {
  try {
    validateMiningWork(work);
  } catch {
    return {
      accepted: false,
      jobId: work.jobId,
      workerId: share.workerId,
      nonce: share.nonce,
      reason: "invalid_work",
    };
  }

  if (share.jobId !== work.jobId) {
    return {
      accepted: false,
      jobId: share.jobId,
      workerId: share.workerId,
      nonce: share.nonce,
      reason: "invalid_work",
    };
  }

  if (!Number.isInteger(share.nonce) || share.nonce < 0 || share.nonce > 0xffffffff) {
    return {
      accepted: false,
      jobId: work.jobId,
      workerId: share.workerId,
      nonce: share.nonce,
      reason: "invalid_nonce",
    };
  }

  if (!nonceInWorkRange(work, share.nonce)) {
    return {
      accepted: false,
      jobId: work.jobId,
      workerId: share.workerId,
      nonce: share.nonce,
      reason: "nonce_out_of_range",
    };
  }

  const hashHex = hashToDisplayHex(hashHeader(work.headerPrefix76, share.nonce));

  if (share.hashHex !== undefined && !/^[0-9a-fA-F]{64}$/.test(share.hashHex)) {
    return {
      accepted: false,
      jobId: work.jobId,
      workerId: share.workerId,
      nonce: share.nonce,
      hashHex,
      reason: "invalid_hash",
    };
  }

  if (share.hashHex !== undefined && share.hashHex.toLowerCase() !== hashHex) {
    return {
      accepted: false,
      jobId: work.jobId,
      workerId: share.workerId,
      nonce: share.nonce,
      hashHex,
      reason: "invalid_hash",
    };
  }

  if (!hashMeetsTarget(Buffer.from(hashHex, "hex").reverse(), work.targetHex)) {
    return {
      accepted: false,
      jobId: work.jobId,
      workerId: share.workerId,
      nonce: share.nonce,
      hashHex,
      reason: "target_not_met",
    };
  }

  return {
    accepted: true,
    jobId: work.jobId,
    workerId: share.workerId,
    nonce: share.nonce,
    hashHex,
  };
}
