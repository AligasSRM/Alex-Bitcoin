import { MiningJobBranchManager } from "../pool/job-distribution";
import { MiningWorkerRegistry } from "../pool/workers";
import { searchMiningWork } from "./search";
import type { MiningAuditEvent, MiningSearchOptions, MiningSearchResult, MiningWork } from "./types";
import { validateMiningWork } from "./validation";

export interface MinerCoreConfig {
  workerRegistry?: MiningWorkerRegistry;
  branchManager?: MiningJobBranchManager;
}

export interface MinerCoreJobSnapshot {
  jobId: string;
  active: boolean;
  workerIds: string[];
  createdAt: string;
}

export class MinerCore {
  private readonly workers: MiningWorkerRegistry;
  private readonly branches: MiningJobBranchManager;
  private readonly jobs = new Map<string, MiningWork>();
  private readonly auditEvents: MiningAuditEvent[] = [];

  constructor(config: MinerCoreConfig = {}) {
    this.workers = config.workerRegistry ?? new MiningWorkerRegistry();
    this.branches = config.branchManager ?? new MiningJobBranchManager(this.workers);
  }

  registerWork(work: MiningWork): void {
    validateMiningWork(work);
    if (this.jobs.has(work.jobId)) throw new Error("jobId already exists");
    this.jobs.set(work.jobId, { ...work, headerPrefix76: new Uint8Array(work.headerPrefix76) });
    this.audit({ jobId: work.jobId, workerId: "system", type: "started", timestamp: new Date().toISOString() });
  }

  activateJob(jobId: string): void {
    const work = this.requireJob(jobId);
    const distribution = this.branches.distribute(work);
    if (distribution.branches.length === 0) throw new Error("job has no worker branches");
  }

  retireJob(jobId: string): void {
    this.requireJob(jobId);
    this.jobs.delete(jobId);
    this.branches.clear();
    this.audit({ jobId, workerId: "system", type: "stopped", timestamp: new Date().toISOString(), reason: "job_retired" });
  }

  rollover(work: MiningWork): void {
    validateMiningWork(work);
    if (this.jobs.has(work.jobId)) throw new Error("jobId already exists");
    const previous = [...this.jobs.keys()];
    this.jobs.clear();
    this.branches.clear();
    this.registerWork(work);
    this.activateJob(work.jobId);
    this.audit({
      jobId: work.jobId,
      workerId: "system",
      type: "completed",
      timestamp: new Date().toISOString(),
      reason: previous.length ? "rolled_over" : "started",
    });
  }

  mine(jobId: string, workerId: string, options: MiningSearchOptions = {}): MiningSearchResult {
    const work = this.requireJob(jobId);
    const distribution = this.branches.snapshot(work.jobId);
    const branch = distribution.branches.find((item) => item.workerId === workerId);
    if (!branch) throw new Error("worker is not assigned to active job");
    const workerWork: MiningWork = { ...work, nonceStart: branch.nonceStart, nonceEnd: branch.nonceEnd };
    const result = searchMiningWork(workerWork, options);
    this.audit({
      jobId, workerId, type: result.found ? "found" : "completed",
      timestamp: result.finishedAt, nonce: result.nonce, hashHex: result.hashHex,
      hashesTried: result.hashesTried,
    });
    return result;
  }

  jobSnapshot(): MinerCoreJobSnapshot[] {
    return [...this.jobs.values()].map((work) => ({
      jobId: work.jobId,
      active: true,
      workerIds: this.branches.snapshot(work.jobId).branches.map((branch) => branch.workerId),
      createdAt: work.createdAt,
    }));
  }

  auditSnapshot(): MiningAuditEvent[] {
    return this.auditEvents.map((event) => ({ ...event }));
  }

  getWorkerRegistry(): MiningWorkerRegistry {
    return this.workers;
  }

  getBranchManager(): MiningJobBranchManager {
    return this.branches;
  }

  private requireJob(jobId: string): MiningWork {
    const work = this.jobs.get(jobId);
    if (!work) throw new Error("unknown mining job");
    return work;
  }

  private audit(event: MiningAuditEvent): void {
    this.auditEvents.push({ ...event });
  }
}
