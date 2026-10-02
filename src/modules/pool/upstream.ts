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
  connectionGeneration: number;
}

export class MiningUpstreamBinding {
  private readonly proxy: MiningProxy;
  private readonly upstream: UpstreamJobSource;
  private unsubscribe?: () => void;
  private submittedShares = 0;
  private acceptedShares = 0;
  private rejectedShares = 0;
  private activeJobs = new Set<string>();
  private connectionGeneration = 0;
  private connected = false;

  constructor(proxy: MiningProxy, upstream: UpstreamJobSource) {
    this.proxy = proxy;
    this.upstream = upstream;
  }

  async connect(): Promise<void> {
    if (this.connected || this.upstream.getState() === "connected") return;

    await this.upstream.connect();
    if (this.upstream.getState() !== "connected") {
      throw new Error("upstream did not reach connected state");
    }

    const generation = ++this.connectionGeneration;
    this.connected = true;
    this.unsubscribe?.();
    this.unsubscribe = this.upstream.onJob((work) => {
      if (!this.connected || generation !== this.connectionGeneration) return;
      if (this.activeJobs.has(work.jobId)) throw new Error("upstream jobId already active");
      this.activeJobs.add(work.jobId);
      this.proxy.registerJob(work);
    });
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.connectionGeneration += 1;
    this.unsubscribe?.();
    this.unsubscribe = undefined;

    for (const jobId of this.activeJobs) this.proxy.retireJob(jobId);
    this.activeJobs.clear();

    await this.upstream.disconnect();
  }

  async submitShare(request: {
    workerId: string;
    jobId: string;
    extranonce2: string;
    ntime: string;
    nonce: string;
  }): Promise<boolean> {
    if (!this.connected || this.upstream.getState() !== "connected") {
      this.rejectedShares += 1;
      return false;
    }

    if (!this.activeJobs.has(request.jobId)) {
      this.rejectedShares += 1;
      return false;
    }

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
      connectionGeneration: this.connectionGeneration,
    };
  }
}
