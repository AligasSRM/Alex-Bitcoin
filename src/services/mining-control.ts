import type { MinerAdapter } from "../modules/miner";

export type MiningControlState = "stopped" | "starting" | "mining" | "stopping" | "error";

export interface MiningControlResult {
  ok: boolean;
  state: MiningControlState;
  reason?: string;
}

export interface ControllableMiner extends MinerAdapter {
  startMining?: () => Promise<void>;
  stopMining?: () => Promise<void>;
}

export class MiningControlBoundary {
  private state: MiningControlState = "stopped";

  constructor(private readonly miner: ControllableMiner) {}

  getState(): MiningControlState {
    return this.state;
  }

  async start(): Promise<MiningControlResult> {
    if (this.state === "starting" || this.state === "mining") {
      return { ok: false, state: this.state, reason: "already_running" };
    }
    if (typeof this.miner.startMining !== "function") {
      return { ok: false, state: this.state, reason: "miner_start_control_unavailable" };
    }

    this.state = "starting";
    try {
      await this.miner.startMining();
      this.state = "mining";
      return { ok: true, state: this.state };
    } catch {
      this.state = "error";
      return { ok: false, state: this.state, reason: "miner_start_failed" };
    }
  }

  async stop(): Promise<MiningControlResult> {
    if (this.state === "stopped") {
      return { ok: false, state: this.state, reason: "already_stopped" };
    }
    if (typeof this.miner.stopMining !== "function") {
      this.state = "error";
      return { ok: false, state: this.state, reason: "miner_stop_control_unavailable" };
    }

    this.state = "stopping";
    try {
      await this.miner.stopMining();
      this.state = "stopped";
      return { ok: true, state: this.state };
    } catch {
      this.state = "error";
      return { ok: false, state: this.state, reason: "miner_stop_failed" };
    }
  }
}
