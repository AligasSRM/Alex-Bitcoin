import type { MiningWork } from "../mining/types";
import type { MiningWorkerRegistry } from "./workers";

export interface MiningJobBranch {
  branchId: string;
  jobId: string;
  workerId: string;
  nonceStart: number;
  nonceEnd: number;
}

export interface JobDistributionSnapshot {
  jobId: string;
  branchCount: number;
  branches: MiningJobBranch[];
}

export class MiningJobBranchManager {
  private readonly registry: MiningWorkerRegistry;

  constructor(registry: MiningWorkerRegistry) {
    this.registry = registry;
  }

  distribute(work: MiningWork): JobDistributionSnapshot {
    this.validateWork(work);

    const onlineWorkers = this.registry
      .snapshot()
      .workers
      .filter((worker) => worker.state === "online")
      .sort((a, b) => a.workerId.localeCompare(b.workerId));

    if (onlineWorkers.length === 0) {
      throw new Error("no online workers available for job distribution");
    }

    const totalNonces = work.nonceEnd - work.nonceStart + 1;
    const branchCount = Math.min(onlineWorkers.length, totalNonces);
    const baseSize = Math.floor(totalNonces / branchCount);
    const remainder = totalNonces % branchCount;

    const branches: MiningJobBranch[] = [];
    let cursor = work.nonceStart;

    for (let index = 0; index < branchCount; index += 1) {
      const size = baseSize + (index < remainder ? 1 : 0);
      const nonceStart = cursor;
      const nonceEnd = nonceStart + size - 1;
      branches.push({
        branchId: work.jobId + ":branch:" + (index + 1),
        jobId: work.jobId,
        workerId: onlineWorkers[index].workerId,
        nonceStart,
        nonceEnd,
      });
      cursor = nonceEnd + 1;
    }

    return { jobId: work.jobId, branchCount: branches.length, branches };
  }

  private validateWork(work: MiningWork): void {
    if (!work.jobId.trim()) throw new Error("jobId is required");
    if (!Number.isInteger(work.nonceStart) || work.nonceStart < 0 || work.nonceStart > 0xffffffff) {
      throw new Error("nonceStart must be a valid uint32");
    }
    if (!Number.isInteger(work.nonceEnd) || work.nonceEnd < 0 || work.nonceEnd > 0xffffffff) {
      throw new Error("nonceEnd must be a valid uint32");
    }
    if (work.nonceEnd < work.nonceStart) {
      throw new Error("nonceEnd must be greater than or equal to nonceStart");
    }
  }
}
