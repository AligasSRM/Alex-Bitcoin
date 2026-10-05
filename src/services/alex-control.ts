import type { CoreDependencies } from "../core/application";
import { collectCoreHealthSnapshot } from "../core/health";
import { toDashboardRuntimeSnapshot } from "../dashboard/core-runtime-bridge";
import type { DashboardRuntimeSnapshot } from "../dashboard/runtime-contract";
import { ProductionMiningControl } from "./production-mining-control";

export type AlexControlCommand = "inspect" | "start_mining" | "stop_mining";

export interface AlexControlCapabilities {
  inspect: true;
  startMining: boolean;
  stopMining: boolean;
}

export interface AlexControlResult {
  ok: boolean;
  command: AlexControlCommand;
  observedAt: string;
  state: DashboardRuntimeSnapshot["state"];
  capabilities: AlexControlCapabilities;
  snapshot: DashboardRuntimeSnapshot;
  reason?: string;
}

export interface AlexControlDependencies {
  core: CoreDependencies;
  productionControl: ProductionMiningControl;
}

export class AlexControlBoundary {
  constructor(private readonly deps: AlexControlDependencies) {}

  private capabilities(): AlexControlCapabilities {
    const miner = this.deps.core.miner as {
      startMining?: () => Promise<void>;
      stopMining?: () => Promise<void>;
    };

    return {
      inspect: true,
      startMining: typeof miner.startMining === "function",
      stopMining: typeof miner.stopMining === "function",
    };
  }

  private async inspectSnapshot(): Promise<DashboardRuntimeSnapshot> {
    const health = await collectCoreHealthSnapshot(this.deps.core);
    return toDashboardRuntimeSnapshot(health);
  }

  async inspect(): Promise<AlexControlResult> {
    const snapshot = await this.inspectSnapshot();
    return {
      ok: snapshot.state !== "error",
      command: "inspect",
      observedAt: snapshot.observedAt,
      state: snapshot.state,
      capabilities: this.capabilities(),
      snapshot,
      ...(snapshot.state === "degraded" ? { reason: "runtime_degraded" } : {}),
    };
  }

  async startMining(): Promise<AlexControlResult> {
    const result = await this.deps.productionControl.start();
    const snapshot = await this.inspectSnapshot();

    return {
      ok: result.ok && snapshot.state !== "error",
      command: "start_mining",
      observedAt: snapshot.observedAt,
      state: snapshot.state,
      capabilities: this.capabilities(),
      snapshot,
      ...(result.ok ? {} : { reason: result.reason ?? "start_mining_failed" }),
    };
  }

  async stopMining(): Promise<AlexControlResult> {
    const result = await this.deps.productionControl.stop();
    const snapshot = await this.inspectSnapshot();

    return {
      ok: result.ok && snapshot.state !== "error",
      command: "stop_mining",
      observedAt: snapshot.observedAt,
      state: snapshot.state,
      capabilities: this.capabilities(),
      snapshot,
      ...(result.ok ? {} : { reason: result.reason ?? "stop_mining_failed" }),
    };
  }

  async execute(command: AlexControlCommand): Promise<AlexControlResult> {
    if (command === "inspect") return this.inspect();
    if (command === "start_mining") return this.startMining();
    return this.stopMining();
  }
}
