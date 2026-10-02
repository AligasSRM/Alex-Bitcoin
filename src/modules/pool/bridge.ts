import { MiningAuditLog } from "../mining/audit";
import type { MiningWork } from "../mining/types";
import { ShareSubmissionEngine, type ShareSubmissionResult } from "./share-submission";
import { StratumSession, type StratumSessionOptions, type StratumResponse } from "./stratum";

export interface PoolShareStats {
  accepted: number;
  rejected: number;
  duplicates: number;
}

export interface StratumMiningBridgeOptions extends Omit<StratumSessionOptions, "submit"> {
  audit?: MiningAuditLog;
}

export class StratumMiningBridge {
  readonly shares: ShareSubmissionEngine;
  readonly session: StratumSession;
  private readonly audit?: MiningAuditLog;
  private stats: PoolShareStats = { accepted: 0, rejected: 0, duplicates: 0 };

  constructor(options: StratumMiningBridgeOptions = {}) {
    this.audit = options.audit;
    this.shares = new ShareSubmissionEngine();
    this.session = new StratumSession({
      ...options,
      submit: async (request) => {
        const result = this.shares.submit({
          workerId: request.workerName,
          jobId: request.jobId,
          extranonce2: request.extranonce2,
          ntime: request.ntime,
          nonce: request.nonce,
        });
        this.record(request.workerName, result);
        return result.acceptedForPool;
      },
    });
  }

  registerJob(work: MiningWork): void {
    this.shares.registerJob(work);
  }

  retireJob(jobId: string): void {
    this.shares.retireJob(jobId);
  }

  getStats(): PoolShareStats {
    return { ...this.stats };
  }

  async handleLine(line: string): Promise<StratumResponse | unknown[]> {
    return this.session.handleLine(line);
  }

  private record(workerId: string, result: ShareSubmissionResult): void {
    if (result.duplicate) this.stats.duplicates += 1;
    if (result.acceptedForPool) this.stats.accepted += 1;
    else this.stats.rejected += 1;

    this.audit?.record({
      jobId: result.jobId,
      workerId,
      type: result.acceptedForPool ? "found" : "rejected",
      timestamp: new Date().toISOString(),
      nonce: result.nonce,
      hashHex: result.hashHex,
      reason: result.reason,
    });
  }
}
