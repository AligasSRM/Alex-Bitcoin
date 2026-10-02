import type { MiningWork } from "../mining/types";
import { validateMiningShare, type ShareValidationResult } from "../mining/share";

export interface StratumShareSubmission {
  workerId: string;
  jobId: string;
  extranonce2: string;
  ntime: string;
  nonce: string;
  shareTargetHex?: string;
}

export interface ShareSubmissionResult extends ShareValidationResult {
  duplicate: boolean;
  acceptedForPool: boolean;
}

function isHex(value: string, length: number): boolean {
  return value.length === length && /^[0-9a-fA-F]+$/.test(value);
}

export class ShareSubmissionEngine {
  private readonly jobs = new Map<string, MiningWork>();
  private readonly seen = new Set<string>();

  registerJob(work: MiningWork): void {
    this.jobs.set(work.jobId, work);
  }

  retireJob(jobId: string): void {
    this.jobs.delete(jobId);
  }

  clear(): void {
    this.jobs.clear();
    this.seen.clear();
  }

  submit(request: StratumShareSubmission): ShareSubmissionResult {
    const work = this.jobs.get(request.jobId);
    if (!work) {
      return {
        accepted: false,
        acceptedForPool: false,
        duplicate: false,
        jobId: request.jobId,
        workerId: request.workerId,
        nonce: 0,
        reason: "invalid_work",
      };
    }

    if (!isHex(request.nonce, 8)) {
      return {
        accepted: false,
        acceptedForPool: false,
        duplicate: false,
        jobId: work.jobId,
        workerId: request.workerId,
        nonce: 0,
        reason: "invalid_nonce",
      };
    }

    if (!isHex(request.ntime, 8)) {
      return {
        accepted: false,
        acceptedForPool: false,
        duplicate: false,
        jobId: work.jobId,
        workerId: request.workerId,
        nonce: Number.parseInt(request.nonce, 16),
        reason: "invalid_work",
      };
    }

    const nonce = Number.parseInt(request.nonce, 16);
    const key = [request.workerId, request.jobId, request.extranonce2.toLowerCase(), request.ntime.toLowerCase(), request.nonce.toLowerCase()].join(":");

    if (this.seen.has(key)) {
      const duplicate: ShareSubmissionResult = {
        accepted: false,
        acceptedForPool: false,
        duplicate: true,
        jobId: work.jobId,
        workerId: request.workerId,
        nonce,
        reason: "invalid_work",
      };
      return duplicate;
    }

    this.seen.add(key);
    const validationWork = request.shareTargetHex === undefined ? work : { ...work, targetHex: request.shareTargetHex };
    const result = validateMiningShare(validationWork, {
      jobId: request.jobId,
      workerId: request.workerId,
      nonce,
    });

    return {
      ...result,
      duplicate: false,
      acceptedForPool: result.accepted,
    };
  }
}
