import type { BitcoinCoreBoundary } from "./bitcoin-core-boundary";
import type { MiningEngineResult } from "./sha256d-engine";

export interface MiningSolutionSubmission {
  jobId: string;
  workerId: string;
  nonce: number;
  hashHex: string;
  blockHex: string;
}

export interface MiningSolutionSubmissionResult {
  jobId: string;
  workerId: string;
  nonce: number;
  blockHex: string;
  status: "accepted" | "rejected";
}

export type MiningBlockBuilder = (result: MiningEngineResult) => string;

export class MiningSolutionSubmissionBoundary {
  constructor(
    private readonly bitcoinCore: BitcoinCoreBoundary,
    private readonly buildBlock: MiningBlockBuilder,
  ) {}

  async submit(result: MiningEngineResult): Promise<MiningSolutionSubmissionResult> {
    if (!result.found || result.nonce === undefined || !result.hashHex) {
      throw new Error("cannot submit an unsolved mining result");
    }

    const blockHex = this.buildBlock(result);
    if (!/^[0-9a-fA-F]+$/.test(blockHex) || blockHex.length < 160 || blockHex.length % 2 !== 0) {
      throw new Error("invalid assembled block");
    }

    const status = await this.bitcoinCore.submitBlock(blockHex);
    return {
      jobId: result.jobId,
      workerId: result.workerId,
      nonce: result.nonce,
      blockHex,
      status,
    };
  }
}
