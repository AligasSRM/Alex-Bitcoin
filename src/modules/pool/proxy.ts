import type { MiningWork } from "../mining/types";
import { MiningAuditLog } from "../mining/audit";
import { StratumMiningBridge, type PoolShareStats } from "./bridge";
import type { StratumSessionOptions } from "./stratum";

export type ProxyState = "stopped" | "running" | "degraded";

export interface MiningProxyOptions {
  proxyId: string;
  maxDownstreamSessions?: number;
  session?: Omit<StratumSessionOptions, "submit">;
}

export interface MiningProxySnapshot {
  proxyId: string;
  state: ProxyState;
  downstreamSessions: number;
  registeredJobs: number;
  acceptedShares: number;
  rejectedShares: number;
  duplicateShares: number;
}

export interface ProxySession {
  sessionId: string;
  workerId?: string;
  bridge: StratumMiningBridge;
}

export class MiningProxy {
  private readonly options: MiningProxyOptions;
  private readonly sessions = new Map<string, ProxySession>();
  private readonly jobs = new Map<string, MiningWork>();
  private readonly audit = new MiningAuditLog();
  private state: ProxyState = "stopped";

  constructor(options: MiningProxyOptions) {
    if (!options.proxyId.trim()) throw new Error("proxyId is required");
    const max = options.maxDownstreamSessions ?? 1024;
    if (!Number.isInteger(max) || max < 1) throw new Error("maxDownstreamSessions must be a positive integer");
    this.options = { ...options, maxDownstreamSessions: max };
  }

  start(): void {
    if (this.state === "running") return;
    this.state = "running";
  }

  stop(): void {
    this.sessions.clear();
    this.state = "stopped";
  }

  openSession(sessionId: string): ProxySession {
    if (this.state !== "running") throw new Error("proxy is not running");
    if (!sessionId.trim()) throw new Error("sessionId is required");
    if (this.sessions.has(sessionId)) throw new Error("sessionId already exists");
    if (this.sessions.size >= this.options.maxDownstreamSessions!) throw new Error("downstream session limit reached");

    const bridge = new StratumMiningBridge({
      ...this.options.session,
      audit: this.audit,
    });
    for (const work of this.jobs.values()) bridge.registerJob(work);

    const session: ProxySession = { sessionId, bridge };
    this.sessions.set(sessionId, session);
    return session;
  }

  closeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  registerJob(work: MiningWork): void {
    if (this.state !== "running") throw new Error("proxy is not running");
    if (this.jobs.has(work.jobId)) throw new Error("jobId already exists");
    this.jobs.set(work.jobId, work);
    for (const session of this.sessions.values()) session.bridge.registerJob(work);
  }

  retireJob(jobId: string): void {
    this.jobs.delete(jobId);
    for (const session of this.sessions.values()) session.bridge.retireJob(jobId);
  }

  snapshot(): MiningProxySnapshot {
    const stats = [...this.sessions.values()].reduce<PoolShareStats>(
      (total, session) => {
        const current = session.bridge.getStats();
        total.accepted += current.accepted;
        total.rejected += current.rejected;
        total.duplicates += current.duplicates;
        return total;
      },
      { accepted: 0, rejected: 0, duplicates: 0 },
    );
    return {
      proxyId: this.options.proxyId,
      state: this.state,
      downstreamSessions: this.sessions.size,
      registeredJobs: this.jobs.size,
      acceptedShares: stats.accepted,
      rejectedShares: stats.rejected,
      duplicateShares: stats.duplicates,
    };
  }

  auditSnapshot() {
    return this.audit.snapshot();
  }
}
