import type { CoreDependencies } from "../core/application";
import { collectCoreHealthSnapshot } from "../core/health";
import { toDashboardRuntimeSnapshot } from "../dashboard/core-runtime-bridge";
import type { DashboardRuntimeSnapshot } from "../dashboard/runtime-contract";
import { ProductionMiningControl } from "./production-mining-control";

export const ALEX_CONTROL_SECTIONS = [
  "core",
  "health",
  "miner",
  "asic",
  "pool",
  "stratum",
  "jobs",
  "shares",
  "telemetry",
  "dashboard",
  "wallet",
  "profitability",
  "alerts",
  "lifecycle",
  "security",
  "verification",
  "production_readiness",
  "secrets",
] as const;

export type AlexControlSection = (typeof ALEX_CONTROL_SECTIONS)[number];
export type AlexSectionStatus = "verified" | "degraded" | "unavailable" | "isolated";

export interface AlexControlSectionState {
  section: AlexControlSection;
  status: AlexSectionStatus;
  access: "read_only" | "control" | "isolated";
  source: string;
  detail?: string;
}

export interface AlexSecretsStatus {
  status: "configured" | "missing" | "invalid" | "unavailable";
  exposed: false;
}

export interface AlexControlCommand {
  readonly name: "inspect" | "start_mining" | "stop_mining";
}

export type AlexCommandName = AlexControlCommand["name"];

export interface AlexControlCapabilities {
  inspect: true;
  startMining: boolean;
  stopMining: boolean;
}

export interface AlexControlResult {
  ok: boolean;
  command: AlexCommandName;
  observedAt: string;
  state: DashboardRuntimeSnapshot["state"];
  capabilities: AlexControlCapabilities;
  snapshot: DashboardRuntimeSnapshot;
  sections: AlexControlSectionState[];
  secrets: AlexSecretsStatus;
  reason?: string;
}

export interface AlexControlDependencies {
  core: CoreDependencies;
  productionControl: ProductionMiningControl;
  secretsStatus?: () => Promise<AlexSecretsStatus["status"]>;
}

function sectionStatus(snapshot: DashboardRuntimeSnapshot, connected: boolean): AlexSectionStatus {
  if (!connected) return "unavailable";
  if (snapshot.state === "degraded" || snapshot.state === "error") return "degraded";
  return "verified";
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

  private async secrets(): Promise<AlexSecretsStatus> {
    const status = this.deps.secretsStatus ? await this.deps.secretsStatus() : "unavailable";
    return { status, exposed: false };
  }

  private async buildSections(snapshot: DashboardRuntimeSnapshot): Promise<AlexControlSectionState[]> {
    const connected = snapshot.miner.connected && snapshot.pool.connected;
    const runtimeStatus = sectionStatus(snapshot, connected);
    const walletStatus: AlexSectionStatus = snapshot.wallet.configured ? "verified" : "unavailable";
    const secretStatus = await this.secrets();

    return [
      { section: "core", status: runtimeStatus, access: "read_only", source: "CoreDependencies" },
      { section: "health", status: runtimeStatus, access: "read_only", source: "CoreHealthSnapshot" },
      { section: "miner", status: snapshot.miner.connected ? runtimeStatus : "unavailable", access: "control", source: "MinerAdapter + MiningControlBoundary" },
      { section: "asic", status: snapshot.asic.status ? runtimeStatus : "unavailable", access: "read_only", source: "MinerTelemetry" },
      { section: "pool", status: snapshot.pool.connected ? runtimeStatus : "unavailable", access: "control", source: "PoolAdapter" },
      { section: "stratum", status: snapshot.pool.protocol ? runtimeStatus : "unavailable", access: "read_only", source: "PoolTelemetry endpoint/protocol" },
      { section: "jobs", status: snapshot.pool.currentJobId ? runtimeStatus : "unavailable", access: "read_only", source: "DashboardRuntimeSnapshot.pool.currentJobId" },
      { section: "shares", status: snapshot.shares.accepted !== null || snapshot.shares.rejected !== null ? runtimeStatus : "unavailable", access: "read_only", source: "MinerTelemetry share counters" },
      { section: "telemetry", status: runtimeStatus, access: "read_only", source: "CoreHealthSnapshot + DashboardRuntimeSnapshot" },
      { section: "dashboard", status: "verified", access: "read_only", source: "DashboardRuntimeSnapshot" },
      { section: "wallet", status: walletStatus, access: "read_only", source: "WalletAdapter status only" },
      { section: "profitability", status: snapshot.financial.verified ? runtimeStatus : "unavailable", access: "read_only", source: "CoreHealthSnapshot profitability" },
      { section: "alerts", status: snapshot.events.length > 0 ? "degraded" : "verified", access: "read_only", source: "CoreHealthSnapshot alerts" },
      { section: "lifecycle", status: runtimeStatus, access: "control", source: "ProductionMiningControl + lifecycle" },
      { section: "security", status: "verified", access: "read_only", source: "Fail-closed control boundary" },
      { section: "verification", status: "verified", access: "read_only", source: "Typed runtime contracts + regression tests" },
      { section: "production_readiness", status: connected ? runtimeStatus : "unavailable", access: "read_only", source: "Verified runtime connectivity only" },
      { section: "secrets", status: "isolated", access: "isolated", source: `SecretsBoundary:${secretStatus.status}` },
    ];
  }

  private async result(
    command: AlexCommandName,
    ok: boolean,
    reason?: string,
  ): Promise<AlexControlResult> {
    const snapshot = await this.inspectSnapshot();
    return {
      ok: ok && snapshot.state !== "error",
      command,
      observedAt: snapshot.observedAt,
      state: snapshot.state,
      capabilities: this.capabilities(),
      snapshot,
      sections: await this.buildSections(snapshot),
      secrets: await this.secrets(),
      ...(reason ? { reason } : {}),
    };
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
      sections: await this.buildSections(snapshot),
      secrets: await this.secrets(),
      ...(snapshot.state === "degraded" ? { reason: "runtime_degraded" } : {}),
    };
  }

  async startMining(): Promise<AlexControlResult> {
    const result = await this.deps.productionControl.start();
    return this.result("start_mining", result.ok, result.ok ? undefined : result.reason ?? "start_mining_failed");
  }

  async stopMining(): Promise<AlexControlResult> {
    const result = await this.deps.productionControl.stop();
    return this.result("stop_mining", result.ok, result.ok ? undefined : result.reason ?? "stop_mining_failed");
  }

  async execute(command: AlexCommandName): Promise<AlexControlResult> {
    if (command === "inspect") return this.inspect();
    if (command === "start_mining") return this.startMining();
    return this.stopMining();
  }
}
