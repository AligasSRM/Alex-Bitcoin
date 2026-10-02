import type { MiningWork } from "../mining/types";
import { MiningProxy } from "./proxy";

export type UpstreamState = "disconnected" | "connecting" | "connected" | "degraded";

export interface UpstreamJobSource {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getState(): UpstreamState;
  onJob(handler: (work: MiningWork) => void): () => void;
  submitShare(request: {
    workerId: string;
    jobId: string;
    extranonce2: string;
    ntime: string;
    nonce: string;
  }): Promise<boolean>;
}

export interface UpstreamBindingSnapshot {
  state: UpstreamState;
  activeJobs: number;
  submittedShares: number;
  acceptedShares: number;
  rejectedShares: number;
}

export class MiningUpstreamBinding {
  private readonly proxy: MiningProxy;
  private readonly upstream: UpstreamJobSource;
  private unsubscribe?: () => void;
  private submittedShares = 0;
  private acceptedShares = 0;
  private rejectedShares = 0;
  private activeJobs = new Set<string>();

  constructor(proxy: MiningProxy, upstream: UpstreamJobSource) {
    this.proxy = proxy;
    this.upstream = upstream;
  }

  async connect(): Promise<void> {
    await this.upstream.connect();
    this.unsubscribe = this.upstream.onJob((work) => {
      this.activeJobs.add(work.jobId);
      this.proxy.registerJob(work);
    });
  }

  async disconnect(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    await this.upstream.disconnect();
    this.activeJobs.clear();
  }

  async submitShare(request: {
    workerId: string;
    jobId: string;
    extranonce2: string;
    ntime: string;
    nonce: string;
  }): Promise<boolean> {
    this.submittedShares += 1;
    const accepted = await this.upstream.submitShare(request);
    if (accepted) this.acceptedShares += 1;
    else this.rejectedShares += 1;
    return accepted;
  }

  snapshot(): UpstreamBindingSnapshot {
    return {
      state: this.upstream.getState(),
      activeJobs: this.activeJobs.size,
      submittedShares: this.submittedShares,
      acceptedShares: this.acceptedShares,
      rejectedShares: this.rejectedShares,
    };
  }
}
