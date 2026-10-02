import { searchMiningWork } from "./search";
import type { MiningSearchResult, MiningWork } from "./types";

export type MiningJobStatus =
  | "queued"
  | "running"
  | "found"
  | "completed"
  | "stopped"
  | "rejected";

export interface MiningJobSnapshot {
  jobId: string;
  status: MiningJobStatus;
  submittedAt: string;
  startedAt?: string;
  finishedAt?: string;
  result?: MiningSearchResult;
  rejectionReason?: string;
}

interface MiningJobRecord {
  work: MiningWork;
  snapshot: MiningJobSnapshot;
}

export class MiningJobPipeline {
  private readonly jobs = new Map<string, MiningJobRecord>();
  private readonly queue: string[] = [];
  private readonly stopRequested = new Set<string>();

  submit(work: MiningWork): MiningJobSnapshot {
    if (this.jobs.has(work.jobId)) {
      const existing = this.jobs.get(work.jobId)!;
      if (existing.snapshot.status !== "rejected") {
        throw new Error("jobId already exists");
      }
    }

    const submittedAt = new Date().toISOString();
    const snapshot: MiningJobSnapshot = {
      jobId: work.jobId,
      status: "queued",
      submittedAt,
    };

    this.jobs.set(work.jobId, { work, snapshot });
    this.queue.push(work.jobId);
    return this.clone(snapshot);
  }

  stop(jobId: string): MiningJobSnapshot {
    const record = this.jobs.get(jobId);
    if (!record) throw new Error("unknown jobId");

    if (record.snapshot.status === "queued") {
      record.snapshot = {
        ...record.snapshot,
        status: "stopped",
        finishedAt: new Date().toISOString(),
      };
      this.removeFromQueue(jobId);
      return this.clone(record.snapshot);
    }

    if (record.snapshot.status === "running") {
      this.stopRequested.add(jobId);
      return this.clone(record.snapshot);
    }

    return this.clone(record.snapshot);
  }

  runNext(options?: { maxHashes?: number }): MiningJobSnapshot | undefined {
    const jobId = this.queue.shift();
    if (!jobId) return undefined;

    const record = this.jobs.get(jobId);
    if (!record || record.snapshot.status !== "queued") return this.runNext(options);

    const startedAt = new Date().toISOString();
    record.snapshot = { ...record.snapshot, status: "running", startedAt };

    if (this.stopRequested.has(jobId)) {
      this.stopRequested.delete(jobId);
      record.snapshot = {
        ...record.snapshot,
        status: "stopped",
        finishedAt: new Date().toISOString(),
      };
      return this.clone(record.snapshot);
    }

    try {
      const result = searchMiningWork(record.work, {
        maxHashes: options?.maxHashes,
        stopSignal: () => this.stopRequested.has(jobId),
      });

      const stopped = this.stopRequested.delete(jobId);
      const finishedAt = result.finishedAt;

      record.snapshot = {
        ...record.snapshot,
        status: stopped ? "stopped" : result.found ? "found" : "completed",
        finishedAt,
        result,
      };
      return this.clone(record.snapshot);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown mining job error";
      record.snapshot = {
        ...record.snapshot,
        status: "rejected",
        finishedAt: new Date().toISOString(),
        rejectionReason: reason,
      };
      this.stopRequested.delete(jobId);
      return this.clone(record.snapshot);
    }
  }

  get(jobId: string): MiningJobSnapshot | undefined {
    const record = this.jobs.get(jobId);
    return record ? this.clone(record.snapshot) : undefined;
  }

  pendingJobIds(): string[] {
    return [...this.queue];
  }

  private removeFromQueue(jobId: string): void {
    const index = this.queue.indexOf(jobId);
    if (index >= 0) this.queue.splice(index, 1);
  }

  private clone(snapshot: MiningJobSnapshot): MiningJobSnapshot {
    return {
      ...snapshot,
      result: snapshot.result ? { ...snapshot.result } : undefined,
    };
  }
}
