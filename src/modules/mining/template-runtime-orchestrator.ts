import type { BitcoinCoreBoundary } from "./bitcoin-core-boundary";
import { miningWorkFromBitcoinCoreTemplate } from "./core-mining-work-bridge";
import type { MinerCore } from "./miner-core";
import type { MiningEngineResult } from "./sha256d-engine";
import { MinerWorkerRuntime } from "./miner-worker-runtime";

export interface TemplateRuntimeOrchestratorConfig {
  workerId: string;
  maxHashes?: number;
}

export class BitcoinCoreTemplateRuntimeOrchestrator {
  constructor(
    private readonly core: MinerCore,
    private readonly bitcoinCore: BitcoinCoreBoundary,
    private readonly runtime: MinerWorkerRuntime = new MinerWorkerRuntime(core),
  ) {}

  async refreshWork(): Promise<string> {
    const template = await this.bitcoinCore.getBlockTemplate();
    const work = miningWorkFromBitcoinCoreTemplate(template);
    await this.runtime.rollover(work);
    return work.jobId;
  }

  startWorker(options: TemplateRuntimeOrchestratorConfig): Promise<MiningEngineResult> {
    if (!options.workerId) throw new Error("workerId is required");
    return this.runtime.start(this.requireActiveJob(), options.workerId, {
      maxHashes: options.maxHashes,
    });
  }

  stopWorker(workerId: string): void {
    this.runtime.stopWorker(workerId);
  }

  snapshot() {
    return this.runtime.snapshot();
  }

  private requireActiveJob(): string {
    const jobs = this.core.jobSnapshot();
    const active = jobs.find((job) => job.active);
    if (!active) throw new Error("no active Bitcoin Core mining job");
    return active.jobId;
  }
}
