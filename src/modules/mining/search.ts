import { hashHeader, hashMeetsTarget, hashToDisplayHex } from "./sha256d";
import { validateMiningWork } from "./validation";
import type { MiningSearchOptions, MiningSearchResult, MiningWork } from "./types";

export function searchMiningWork(work: MiningWork, options: MiningSearchOptions = {}): MiningSearchResult {
  validateMiningWork(work);
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const maxHashes = options.maxHashes ?? Number.POSITIVE_INFINITY;
  let hashesTried = 0;

  for (let nonce = work.nonceStart; nonce <= work.nonceEnd; nonce += 1) {
    if (hashesTried >= maxHashes || options.stopSignal?.()) break;
    const hash = hashHeader(work.headerPrefix76, nonce);
    hashesTried += 1;
    if (hashMeetsTarget(hash, work.targetHex)) {
      const finishedAt = new Date().toISOString();
      return {
        jobId: work.jobId,
        found: true,
        nonce,
        hashHex: hashToDisplayHex(hash),
        hashesTried,
        startedAt,
        finishedAt,
        elapsedMs: Date.now() - startedMs,
      };
    }
  }

  const finishedAt = new Date().toISOString();
  return {
    jobId: work.jobId,
    found: false,
    hashesTried,
    startedAt,
    finishedAt,
    elapsedMs: Date.now() - startedMs,
  };
}
