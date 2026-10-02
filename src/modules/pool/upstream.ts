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

export interface UpstreamReconnectPolicy {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  sleep?: (delayMs: number) => Promise<void>;
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

  async reconnect(): Promise<void> {
    await this.disconnect();
    await this.connect();
  }

  async reconnectWithPolicy(policy: UpstreamReconnectPolicy): Promise<void> {
    if (!Number.isInteger(policy.maxAttempts) || policy.maxAttempts < 1) {
      throw new Error("maxAttempts must be a positive integer");
    }
    if (!Number.isFinite(policy.initialDelayMs) || policy.initialDelayMs < 0) {
      throw new Error("initialDelayMs must be non-negative");
    }
    if (!Number.isFinite(policy.maxDelayMs) || policy.maxDelayMs < policy.initialDelayMs) {
      throw new Error("maxDelayMs must be greater than or equal to initialDelayMs");
    }

    const sleep = policy.sleep ?? ((delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs)));
    let delayMs = policy.initialDelayMs;
    let lastError: unknown;

    await this.disconnect();

    for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
      try {
        await this.connect();
        return;
      } catch (error) {
        lastError = error;
        if (attempt === policy.maxAttempts) break;
        if (delayMs > 0) await sleep(delayMs);
        delayMs = Math.min(Math.max(delayMs * 2, policy.initialDelayMs), policy.maxDelayMs);
      }
    }

    throw lastError instanceof Error ? lastError : new Error("upstream reconnect attempts exhausted");
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

export class UpstreamRecoverySupervisor {
  private recovery?: Promise<void>;

  constructor(
    private readonly binding: MiningUpstreamBinding,
    private readonly policy: UpstreamReconnectPolicy,
  ) {}

  recover(): Promise<void> {
    if (this.recovery) return this.recovery;

    this.recovery = this.binding.reconnectWithPolicy(this.policy).finally(() => {
      this.recovery = undefined;
    });

    return this.recovery;
  }

  recoverIfNeeded(): Promise<boolean> {
    if (this.binding.snapshot().state === "connected") return Promise.resolve(false);
    return this.recover().then(() => true);
  }

  isRecovering(): boolean {
    return this.recovery !== undefined;
  }
}
