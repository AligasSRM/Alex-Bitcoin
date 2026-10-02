import type { PoolShareStats } from "./bridge";

export type WorkerState = "offline" | "online" | "degraded";

export interface MiningWorkerRecord {
  workerId: string;
  workerName: string;
  accountId?: string;
  deviceId?: string;
  state: WorkerState;
  hashrateHps: number;
  acceptedShares: number;
  rejectedShares: number;
  duplicateShares: number;
  staleShares: number;
  lastSeenAt?: string;
}

export interface WorkerRegistrySnapshot {
  totalWorkers: number;
  onlineWorkers: number;
  workers: MiningWorkerRecord[];
}

export class MiningWorkerRegistry {
  private readonly workers = new Map<string, MiningWorkerRecord>();

  register(worker: {
    workerId: string;
    workerName: string;
    accountId?: string;
    deviceId?: string;
  }): MiningWorkerRecord {
    if (!worker.workerId.trim()) throw new Error("workerId is required");
    if (!worker.workerName.trim()) throw new Error("workerName is required");
    if (this.workers.has(worker.workerId)) throw new Error("workerId already exists");

    const record: MiningWorkerRecord = {
      workerId: worker.workerId,
      workerName: worker.workerName,
      accountId: worker.accountId,
      deviceId: worker.deviceId,
      state: "offline",
      hashrateHps: 0,
      acceptedShares: 0,
      rejectedShares: 0,
      duplicateShares: 0,
      staleShares: 0,
    };
    this.workers.set(worker.workerId, record);
    return { ...record };
  }

  unregister(workerId: string): void {
    this.workers.delete(workerId);
  }

  setState(workerId: string, state: WorkerState): void {
    const worker = this.require(workerId);
    worker.state = state;
    worker.lastSeenAt = new Date().toISOString();
  }

  setHashrate(workerId: string, hashrateHps: number): void {
    if (!Number.isFinite(hashrateHps) || hashrateHps < 0) throw new Error("hashrateHps must be non-negative and finite");
    const worker = this.require(workerId);
    worker.hashrateHps = hashrateHps;
    worker.lastSeenAt = new Date().toISOString();
  }

  recordShare(workerId: string, stats: PoolShareStats & { stale?: number }): void {
    const worker = this.require(workerId);
    worker.acceptedShares += stats.accepted;
    worker.rejectedShares += stats.rejected;
    worker.duplicateShares += stats.duplicates;
    worker.staleShares += stats.stale ?? 0;
    worker.lastSeenAt = new Date().toISOString();
  }

  get(workerId: string): MiningWorkerRecord | undefined {
    const worker = this.workers.get(workerId);
    return worker ? { ...worker } : undefined;
  }

  snapshot(): WorkerRegistrySnapshot {
    const workers = [...this.workers.values()].map((worker) => ({ ...worker }));
    return {
      totalWorkers: workers.length,
      onlineWorkers: workers.filter((worker) => worker.state === "online").length,
      workers,
    };
  }

  private require(workerId: string): MiningWorkerRecord {
    const worker = this.workers.get(workerId);
    if (!worker) throw new Error("worker not registered");
    return worker;
  }
}
