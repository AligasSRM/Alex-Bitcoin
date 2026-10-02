import { Sha256dMiningEngine, type MiningEngineResult } from "./sha256d-engine";
import type { MinerCore } from "./miner-core";
import type { MiningWork } from "./types";

export interface WorkerRuntimeStartOptions {
  maxHashes?: number;
}

export interface WorkerRuntimeSnapshot {
  activeJobId?: string;
  runningWorkerIds: string[];
  stoppedWorkerIds: string[];
  totalHashrateHps: number;
}

interface WorkerController {
  jobId: string;
  stop: boolean;
  promise: Promise<MiningEngineResult>;
}

export class MinerWorkerRuntime {
  private readonly engine: Sha256dMiningEngine;
  private readonly controllers = new Map<string, WorkerController>();
  private activeJobId?: string;

  constructor(private readonly core: MinerCore, engine = new Sha256dMiningEngine()) {
    this.engine = engine;
  }

  start(jobId: string, workerId: string, options: WorkerRuntimeStartOptions = {}): Promise<MiningEngineResult> {
    if (this.controllers.has(workerId)) throw new Error("worker is already running");
    const branch = this.core.getBranchManager().snapshot(jobId).branches.find((item) => item.workerId === workerId);
    if (!branch) throw new Error("worker is not assigned to active job");

    const baseWork = this.core.getActiveWork(jobId);
    const work: MiningWork = {
      ...baseWork,
      headerPrefix76: new Uint8Array(baseWork.headerPrefix76),
      nonceStart: branch.nonceStart,
      nonceEnd: branch.nonceEnd,
    };

    const controller: WorkerController = { jobId, stop: false, promise: Promise.resolve(undefined as never) };
    const promise = Promise.resolve().then(() =>
      this.engine.scan(work, workerId, {
        maxHashes: options.maxHashes,
        stopSignal: () => controller.stop,
      }),
    );
    controller.promise = promise;
    this.controllers.set(workerId, controller);
    this.activeJobId = jobId;

    void promise.finally(() => {
      const current = this.controllers.get(workerId);
      if (current === controller) this.controllers.delete(workerId);
      const result = current === controller ? undefined : undefined;
      if (result) this.core.getWorkerRegistry().setHashrate(workerId, result.hashrateHps);
    });

    return promise.then((result) => {
      this.core.getWorkerRegistry().setHashrate(workerId, result.hashrateHps);
      return result;
    });
  }

  stopWorker(workerId: string): void {
    const controller = this.controllers.get(workerId);
    if (!controller) return;
    controller.stop = true;
  }

  stopJob(jobId: string): void {
    for (const [workerId, controller] of this.controllers) {
      if (controller.jobId === jobId) {
        controller.stop = true;
        this.controllers.delete(workerId);
      }
    }
    if (this.activeJobId === jobId) this.activeJobId = undefined;
  }

  async waitForWorker(workerId: string): Promise<MiningEngineResult | undefined> {
    const controller = this.controllers.get(workerId);
    if (!controller) return undefined;
    return controller.promise;
  }

  async rollover(work: MiningWork): Promise<void> {
    if (this.activeJobId) this.stopJob(this.activeJobId);
    this.core.rollover(work);
    this.activeJobId = work.jobId;
  }

  snapshot(): WorkerRuntimeSnapshot {
    const registry = this.core.getWorkerRegistry().snapshot();
    const runningWorkerIds = [...this.controllers.keys()];
    const runningSet = new Set(runningWorkerIds);
    return {
      activeJobId: this.activeJobId,
      runningWorkerIds,
      stoppedWorkerIds: registry.workers
        .filter((worker) => worker.state !== "online" || !runningSet.has(worker.workerId))
        .map((worker) => worker.workerId),
      totalHashrateHps: registry.workers.reduce((total, worker) => total + worker.hashrateHps, 0),
    };
  }
}
