import { hashHeader, hashMeetsTarget, hashToDisplayHex } from "./sha256d";
import { validateMiningWork } from "./validation";
import type { MiningWork } from "./types";

export interface MiningEngineOptions {
  maxHashes?: number;
  stopSignal?: () => boolean;
  onHash?: (hashesTried: number) => void;
}

export interface MiningEngineResult {
  jobId: string;
  workerId: string;
  found: boolean;
  nonce?: number;
  hashHex?: string;
  hashesTried: number;
  startedAt: string;
  finishedAt: string;
  elapsedMs: number;
  hashrateHps: number;
  stopped: boolean;
}

export class Sha256dMiningEngine {
  scan(work: MiningWork, workerId: string, options: MiningEngineOptions = {}): MiningEngineResult {
    validateMiningWork(work);
    if (!workerId.trim()) throw new Error("workerId is required");
    if (options.maxHashes !== undefined && (!Number.isInteger(options.maxHashes) || options.maxHashes < 0)) {
      throw new Error("maxHashes must be a non-negative integer");
    }

    const startedAt = new Date().toISOString();
    const startedMs = Date.now();
    const maxHashes = options.maxHashes ?? Number.POSITIVE_INFINITY;
    let hashesTried = 0;
    let stopped = false;

    for (let nonce = work.nonceStart; nonce <= work.nonceEnd; nonce += 1) {
      if (hashesTried >= maxHashes || options.stopSignal?.()) {
        stopped = true;
        break;
      }

      const hash = hashHeader(work.headerPrefix76, nonce);
      hashesTried += 1;
      options.onHash?.(hashesTried);

      if (hashMeetsTarget(hash, work.targetHex)) {
        const finishedAt = new Date().toISOString();
        const elapsedMs = Math.max(0, Date.now() - startedMs);
        return {
          jobId: work.jobId,
          workerId,
          found: true,
          nonce,
          hashHex: hashToDisplayHex(hash),
          hashesTried,
          startedAt,
          finishedAt,
          elapsedMs,
          hashrateHps: hashesTried / Math.max(elapsedMs / 1000, 0.001),
          stopped: false,
        };
      }
    }

    const finishedAt = new Date().toISOString();
    const elapsedMs = Math.max(0, Date.now() - startedMs);
    return {
      jobId: work.jobId,
      workerId,
      found: false,
      hashesTried,
      startedAt,
      finishedAt,
      elapsedMs,
      hashrateHps: hashesTried / Math.max(elapsedMs / 1000, 0.001),
      stopped,
    };
  }
}
