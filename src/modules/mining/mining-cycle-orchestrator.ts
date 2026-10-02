import type { MiningEngineResult } from "./sha256d-engine";
import { MiningSolutionSubmissionBoundary, type MiningSolutionSubmissionResult } from "./solution-submission-boundary";
import { BitcoinCoreTemplateRuntimeOrchestrator, type TemplateRuntimeOrchestratorConfig } from "./template-runtime-orchestrator";

export interface MiningCycleResult {
  mining: MiningEngineResult;
  submission?: MiningSolutionSubmissionResult;
}

export class BitcoinMiningCycleOrchestrator {
  constructor(
    private readonly runtime: BitcoinCoreTemplateRuntimeOrchestrator,
    private readonly submission: MiningSolutionSubmissionBoundary,
  ) {}

  async run(options: TemplateRuntimeOrchestratorConfig): Promise<MiningCycleResult> {
    await this.runtime.refreshWork();
    const mining = await this.runtime.startWorker(options);
    if (!mining.found) return { mining };

    const submission = await this.submission.submit(mining);
    return { mining, submission };
  }

  stopWorker(workerId: string): void {
    this.runtime.stopWorker(workerId);
  }

  snapshot() {
    return this.runtime.snapshot();
  }
}

export { MiningSolutionSubmissionBoundary };
