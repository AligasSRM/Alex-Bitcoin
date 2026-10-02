export interface BitcoinCoreMiningTemplate {
  jobId: string;
  headerPrefix76: Uint8Array;
  targetHex: string;
  createdAt: string;
}

export interface BitcoinCoreBoundary {
  getBlockTemplate(): Promise<BitcoinCoreMiningTemplate>;
  submitBlock(blockHex: string): Promise<"accepted" | "rejected">;
}

export class BitcoinCoreRegtestBoundary implements BitcoinCoreBoundary {
  constructor(private readonly transport: BitcoinCoreBoundary) {}

  getBlockTemplate(): Promise<BitcoinCoreMiningTemplate> {
    return this.transport.getBlockTemplate();
  }

  submitBlock(blockHex: string): Promise<"accepted" | "rejected"> {
    if (!/^[0-9a-fA-F]+$/.test(blockHex) || blockHex.length < 160) {
      return Promise.resolve("rejected");
    }
    return this.transport.submitBlock(blockHex);
  }
}
