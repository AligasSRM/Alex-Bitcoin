import type { CoreHealthSnapshot } from "../core/health";
import type { DashboardRuntimeSnapshot, RuntimeState } from "./runtime-contract";

function parseEndpoint(endpoint: string): { host: string | null; port: number | null; protocol: "stratum-v1" | "stratum-v2" | null } {
  try {
    const normalized = endpoint.includes("://") ? endpoint : `stratum+tcp://${endpoint}`;
    const url = new URL(normalized);
    const protocol = url.protocol === "stratum+tcp:" ? "stratum-v1" : url.protocol === "stratum+ssl:" ? "stratum-v1" : null;
    return { host: url.hostname || null, port: url.port ? Number(url.port) : null, protocol };
  } catch {
    return { host: null, port: null, protocol: null };
  }
}

function efficiencyJPerTH(powerWatts: number, hashrateHps: number): number | null {
  if (!Number.isFinite(powerWatts) || !Number.isFinite(hashrateHps) || powerWatts < 0 || hashrateHps <= 0) return null;
  return powerWatts / (hashrateHps / 1e12);
}

function stateFor(snapshot: CoreHealthSnapshot): RuntimeState {
  if (!snapshot.miner || !snapshot.pool || !snapshot.wallet) return "degraded";
  if (snapshot.miner.connection !== "connected" || snapshot.pool.connection !== "connected") return "degraded";
  return "ready";
}

/**
 * Converts the verified core health boundary into the dashboard's fail-closed shape.
 * This mapper does not invent mining state, share data, pool difficulty, ASIC internals,
 * network telemetry, or financial verification.
 */
export function toDashboardRuntimeSnapshot(snapshot: CoreHealthSnapshot): DashboardRuntimeSnapshot {
  const miner = snapshot.miner;
  const pool = snapshot.pool;
  const wallet = snapshot.wallet;
  const endpoint = pool ? parseEndpoint(pool.endpoint) : { host: null, port: null, protocol: null };
  const state = stateFor(snapshot);

  return {
    observedAt: snapshot.collectedAt,
    state,
    miner: {
      connected: miner?.connection === "connected",
      hashrate: miner?.hashrateHps ?? null,
      temperatureC: miner?.temperatureC ?? null,
      powerW: miner?.powerWatts ?? null,
      efficiencyJPerTH: miner ? efficiencyJPerTH(miner.powerWatts, miner.hashrateHps) : null,
      uptimeSeconds: null,
    },
    pool: {
      connected: pool?.connection === "connected",
      host: endpoint.host,
      port: endpoint.port,
      protocol: endpoint.protocol,
      authorized: null,
      difficulty: null,
      shareTargetHex: null,
      currentJobId: null,
      lastResponseAt: pool?.observedAt ?? null,
    },
    shares: {
      submitted: miner ? miner.acceptedShares + miner.rejectedShares : null,
      accepted: miner?.acceptedShares ?? null,
      rejected: miner?.rejectedShares ?? null,
      stale: null,
      lastShareAt: null,
      bestShareDifficulty: null,
    },
    wallet: {
      configured: wallet !== null && wallet.payoutAddress.length > 0,
      address: wallet?.payoutAddress ?? null,
    },
    asic: {
      boardCount: null,
      chipCount: null,
      frequencyMHz: null,
      hardwareErrors: null,
      fanRpm: null,
      status: miner?.connection ?? null,
    },
    network: {
      internetConnected: null,
      latencyMs: null,
      reconnects: null,
      lastError: null,
    },
    events: snapshot.alerts.map((alert) => ({
      at: alert.observedAt,
      severity: alert.severity === "critical" ? "error" : alert.severity === "warning" ? "warning" : "info",
      source: alert.source,
      message: alert.message,
    })),
    financial: {
      btcEarned: null,
      electricityCost: null,
      profitLoss: null,
      verified: false,
    },
  };
}
