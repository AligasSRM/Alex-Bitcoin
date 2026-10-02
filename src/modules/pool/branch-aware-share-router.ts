import type { StratumShareSubmission, ShareSubmissionResult, ShareSubmissionEngine } from "./share-submission";
import type { MiningJobBranchManager, JobDistributionSnapshot } from "./job-distribution";
import type { MiningWork } from "../mining/types";

export type BranchRoutingReason =
  | "unknown_job"
  | "unknown_worker"
  | "worker_not_assigned"
  | "nonce_out_of_branch_range";

export interface BranchAwareShareResult extends ShareSubmissionResult {
  routed: boolean;
  branchId?: string;
  routingReason?: BranchRoutingReason;
}

export class BranchAwareShareRouter {
  private readonly jobs = new Map<string, JobDistributionSnapshot>();

  constructor(
    private readonly branchManager: MiningJobBranchManager,
    private readonly submissionEngine: ShareSubmissionEngine,
  ) {}

  registerJob(work: MiningWork): JobDistributionSnapshot {
    this.submissionEngine.registerJob(work);
    const distribution = this.branchManager.distribute(work);
    this.jobs.set(work.jobId, distribution);
    return distribution;
  }

  retireJob(jobId: string): void {
    this.jobs.delete(jobId);
    this.submissionEngine.retireJob(jobId);
  }

  clear(): void {
    this.jobs.clear();
    this.submissionEngine.clear();
  }

  submit(request: StratumShareSubmission): BranchAwareShareResult {
    const distribution = this.jobs.get(request.jobId);
    if (!distribution) {
      return {
        accepted: false,
        acceptedForPool: false,
        duplicate: false,
        routed: false,
        jobId: request.jobId,
        workerId: request.workerId,
        nonce: 0,
        reason: "invalid_work",
        routingReason: "unknown_job",
      };
    }

    const nonce = Number.parseInt(request.nonce, 16);
    if (!Number.isInteger(nonce) || nonce < 0 || nonce > 0xffffffff) {
      const result = this.submissionEngine.submit(request);
      return { ...result, routed: false };
    }

    const branch = distribution.branches.find(
      (candidate) =>
        candidate.workerId === request.workerId &&
        nonce >= candidate.nonceStart &&
        nonce <= candidate.nonceEnd,
    );

    if (!branch) {
      const workerAssigned = distribution.branches.some(
        (candidate) => candidate.workerId === request.workerId,
      );
      const result = this.submissionEngine.submit(request);
      return {
        ...result,
        accepted: false,
        acceptedForPool: false,
        routed: false,
        branchId: workerAssigned ? undefined : undefined,
        routingReason: workerAssigned
          ? "nonce_out_of_branch_range"
          : "worker_not_assigned",
        reason: "nonce_out_of_range",
      };
    }

    const result = this.submissionEngine.submit(request);
    return {
      ...result,
      routed: true,
      branchId: branch.branchId,
    };
  }
}
