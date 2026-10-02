import { createConnection, type Socket } from "node:net";
import type { MiningWork } from "../mining/types";
import type { UpstreamJobSource, UpstreamState } from "./upstream";

export interface StratumV1Job {
  jobId: string;
  prevHash: string;
 coinbase1: string;
  coinbase2: string;
 merkleBranches: string[];
 version: string;
 nbits: string;
 ntime: string;
 cleanJobs: boolean;
}

export interface StratumV1UpstreamOptions {
  host: string;
  port: number;
  workerName: string;
  password: string;
  extranonce2Size?: number;
  timeoutMs?: number;
  socketFactory?: (port: number, host: string) => Socket;
  jobToMiningWork: (job: StratumV1Job, extranonce1: string, extranonce2Size: number) => MiningWork;
}

export class StratumV1UpstreamClient implements UpstreamJobSource {
  private readonly options: Required<Omit<StratumV1UpstreamOptions, "socketFactory" | "jobToMiningWork">> & Pick<StratumV1UpstreamOptions, "socketFactory" | "jobToMiningWork">;
  private socket?: Socket;
  private state: UpstreamState = "disconnected";
  private nextId = 1;
  private buffer = "";
  private extranonce1?: string;
  private jobHandler?: (work: MiningWork) => void;
  private readonly pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }>();

  constructor(options: StratumV1UpstreamOptions) {
    if (!options.host.trim()) throw new Error("host is required");
    if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) throw new Error("invalid port");
    if (!options.workerName.trim()) throw new Error("workerName is required");
    if (!Number.isInteger(options.extranonce2Size) || (options.extranonce2Size ?? 4) < 1 || (options.extranonce2Size ?? 4) > 16) throw new Error("invalid extranonce2Size");
    if (!Number.isFinite(options.timeoutMs ?? 10000) || (options.timeoutMs ?? 10000) <= 0) throw new Error("invalid timeoutMs");
    this.options = {
      ...options,
      extranonce2Size: options.extranonce2Size ?? 4,
      timeoutMs: options.timeoutMs ?? 10000,
    };
  }

  async connect(): Promise<void> {
    if (this.state === "connected") return;
    this.state = "connecting";
    const socket = this.options.socketFactory?.(this.options.port, this.options.host) ?? createConnection({ port: this.options.port, host: this.options.host });
    this.socket = socket;
    this.buffer = "";

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        this.state = "disconnected";
        reject(error);
      };
      socket.setTimeout(this.options.timeoutMs, () => fail(new Error("stratum upstream connection timeout")));
      socket.once("connect", () => {
        if (settled) return;
        settled = true;
        resolve();
      });
      socket.once("error", (error) => fail(error instanceof Error ? error : new Error(String(error))));
      socket.on("data", (chunk) => this.onData(chunk.toString("utf8")));
      socket.on("close", () => {
        this.state = "disconnected";
        this.rejectPending(new Error("stratum upstream connection closed"));
      });
      socket.on("error", () => {
        this.state = "disconnected";
      });
    });

    try {
      const subscribed = await this.rpc("mining.subscribe", []);
      const result = subscribed as unknown[];
      if (!Array.isArray(result) || typeof result[1] !== "string" || typeof result[2] !== "number") throw new Error("invalid mining.subscribe response");
      this.extranonce1 = result[1];
      const authorize = await this.rpc("mining.authorize", [this.options.workerName, this.options.password]);
      if (authorize !== true) throw new Error("mining.authorize rejected");
      this.state = "connected";
    } catch (error) {
      await this.disconnect();
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  async disconnect(): Promise<void> {
    this.state = "disconnected";
    this.rejectPending(new Error("stratum upstream disconnected"));
    const socket = this.socket;
    this.socket = undefined;
    this.extranonce1 = undefined;
    this.buffer = "";
    if (socket && !socket.destroyed) socket.destroy();
  }

  getState(): UpstreamState {
    return this.state;
  }

  onJob(handler: (work: MiningWork) => void): () => void {
    this.jobHandler = handler;
    return () => {
      if (this.jobHandler === handler) this.jobHandler = undefined;
    };
  }

  async submitShare(request: { workerId: string; jobId: string; extranonce2: string; ntime: string; nonce: string }): Promise<boolean> {
    if (this.state !== "connected") return false;
    const result = await this.rpc("mining.submit", [request.workerId, request.jobId, request.extranonce2, request.ntime, request.nonce]);
    return result === true;
  }

  private rpc(method: string, params: unknown[]): Promise<unknown> {
    if (!this.socket || this.socket.destroyed) return Promise.reject(new Error("stratum upstream is not connected"));
    const id = this.nextId++;
    const line = JSON.stringify({ id, method, params }) + "\n";
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`stratum RPC timeout: ${method}`));
      }, this.options.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.socket!.write(line, "utf8", (error) => {
        if (error) {
          clearTimeout(timer);
          this.pending.delete(id);
          reject(error);
        }
      });
    });
  }

  private onData(data: string): void {
    this.buffer += data;
    let index = this.buffer.indexOf("\n");
    while (index >= 0) {
      const line = this.buffer.slice(0, index).trim();
      this.buffer = this.buffer.slice(index + 1);
      if (line) this.onLine(line);
      index = this.buffer.indexOf("\n");
    }
  }

  private onLine(line: string): void {
    let message: unknown;
    try { message = JSON.parse(line); } catch { this.state = "degraded"; return; }
    if (!message || typeof message !== "object") return;
    const value = message as Record<string, unknown>;

    if (value.id !== undefined && typeof value.id === "number") {
      const pending = this.pending.get(value.id);
      if (!pending) return;
      clearTimeout(pending.timer);
      this.pending.delete(value.id);
      if (value.error !== null && value.error !== undefined) {
        pending.reject(new Error(`stratum RPC error: ${JSON.stringify(value.error)}`));
      } else {
        pending.resolve(value.result);
      }
      return;
    }

    if (value.method !== "mining.notify" || !Array.isArray(value.params) || value.params.length < 9) return;
    const p = value.params;
    if (!this.extranonce1 || p.some((v) => typeof v !== "string")) return;
    const job: StratumV1Job = {
      jobId: p[0] as string,
      prevHash: p[1] as string,
      coinbase1: p[2] as string,
      coinbase2: p[3] as string,
      merkleBranches: p[4] as unknown[] as string[],
      version: p[5] as string,
      nbits: p[6] as string,
      ntime: p[7] as string,
      cleanJobs: p[8] === true,
    };
    try {
      const work = this.options.jobToMiningWork(job, this.extranonce1, this.options.extranonce2Size);
      this.jobHandler?.(work);
    } catch {
      this.state = "degraded";
    }
  }

  private rejectPending(error: Error): void {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(error);
      this.pending.delete(id);
    }
  }
}
