export const RUNTIME_STATES = [
  "offline",
  "ready",
  "starting",
  "connecting",
  "authorized",
  "job_received",
  "mining",
  "degraded",
  "error",
  "stopped",
] as const;

export type RuntimeState = (typeof RUNTIME_STATES)[number];

export interface DashboardRuntimeSnapshot {
  observedAt: string;
  state: RuntimeState;
  miner: {
    connected: boolean;
    hashrate: number | null;
    temperatureC: number | null;
    powerW: number | null;
    efficiencyJPerTH: number | null;
    uptimeSeconds: number | null;
  };
  pool: {
    connected: boolean;
    host: string | null;
    port: number | null;
    protocol: "stratum-v1" | "stratum-v2" | null;
    authorized: boolean | null;
    difficulty: number | null;
    shareTargetHex: string | null;
    currentJobId: string | null;
    lastResponseAt: string | null;
  };
  shares: {
    submitted: number | null;
    accepted: number | null;
    rejected: number | null;
    stale: number | null;
    lastShareAt: string | null;
    bestShareDifficulty: number | null;
  };
  wallet: {
    configured: boolean;
    address: string | null;
  };
  asic: {
    boardCount: number | null;
    chipCount: number | null;
    frequencyMHz: number | null;
    hardwareErrors: number | null;
    fanRpm: number | null;
    status: string | null;
  };
  network: {
    internetConnected: boolean | null;
    latencyMs: number | null;
    reconnects: number | null;
    lastError: string | null;
  };
  events: Array<{
    at: string;
    severity: "info" | "warning" | "error";
    source: string;
    message: string;
  }>;
  financial: {
    btcEarned: number | null;
    electricityCost: number | null;
    profitLoss: number | null;
    verified: boolean;
  };
}

export type DashboardRuntimeInput = Partial<DashboardRuntimeSnapshot> & {
  observedAt?: string;
  state?: RuntimeState;
};

export const EMPTY_RUNTIME: DashboardRuntimeSnapshot = {
  observedAt: "",
  state: "offline",
  miner: {
    connected: false,
    hashrate: null,
    temperatureC: null,
    powerW: null,
    efficiencyJPerTH: null,
    uptimeSeconds: null,
  },
  pool: {
    connected: false,
    host: null,
    port: null,
    protocol: null,
    authorized: null,
    difficulty: null,
    shareTargetHex: null,
    currentJobId: null,
    lastResponseAt: null,
  },
  shares: {
    submitted: null,
    accepted: null,
    rejected: null,
    stale: null,
    lastShareAt: null,
    bestShareDifficulty: null,
  },
  wallet: { configured: false, address: null },
  asic: { boardCount: null, chipCount: null, frequencyMHz: null, hardwareErrors: null, fanRpm: null, status: null },
  network: { internetConnected: null, latencyMs: null, reconnects: null, lastError: null },
  events: [],
  financial: { btcEarned: null, electricityCost: null, profitLoss: null, verified: false },
};

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function nullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function objectOrEmpty(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

export function normalizeRuntimeSnapshot(input: DashboardRuntimeInput | null | undefined): DashboardRuntimeSnapshot {
  const source = objectOrEmpty(input);
  const miner = objectOrEmpty(source.miner);
  const pool = objectOrEmpty(source.pool);
  const shares = objectOrEmpty(source.shares);
  const wallet = objectOrEmpty(source.wallet);
  const asic = objectOrEmpty(source.asic);
  const network = objectOrEmpty(source.network);
  const financial = objectOrEmpty(source.financial);
  const events = Array.isArray(source.events) ? source.events : [];

  return {
    observedAt: nullableString(source.observedAt) ?? "",
    state: RUNTIME_STATES.includes(source.state as RuntimeState) ? source.state as RuntimeState : "offline",
    miner: {
      connected: source.miner ? Boolean(miner.connected) : false,
      hashrate: nullableNumber(miner.hashrate),
      temperatureC: nullableNumber(miner.temperatureC),
      powerW: nullableNumber(miner.powerW),
      efficiencyJPerTH: nullableNumber(miner.efficiencyJPerTH),
      uptimeSeconds: nullableNumber(miner.uptimeSeconds),
    },
    pool: {
      connected: Boolean(pool.connected),
      host: nullableString(pool.host),
      port: nullableNumber(pool.port),
      protocol: pool.protocol === "stratum-v1" || pool.protocol === "stratum-v2" ? pool.protocol : null,
      authorized: nullableBoolean(pool.authorized),
      difficulty: nullableNumber(pool.difficulty),
      shareTargetHex: nullableString(pool.shareTargetHex),
      currentJobId: nullableString(pool.currentJobId),
      lastResponseAt: nullableString(pool.lastResponseAt),
    },
    shares: {
      submitted: nullableNumber(shares.submitted),
      accepted: nullableNumber(shares.accepted),
      rejected: nullableNumber(shares.rejected),
      stale: nullableNumber(shares.stale),
      lastShareAt: nullableString(shares.lastShareAt),
      bestShareDifficulty: nullableNumber(shares.bestShareDifficulty),
    },
    wallet: { configured: Boolean(wallet.configured), address: nullableString(wallet.address) },
    asic: { boardCount: nullableNumber(asic.boardCount), chipCount: nullableNumber(asic.chipCount), frequencyMHz: nullableNumber(asic.frequencyMHz), hardwareErrors: nullableNumber(asic.hardwareErrors), fanRpm: nullableNumber(asic.fanRpm), status: nullableString(asic.status) },
    network: { internetConnected: nullableBoolean(network.internetConnected), latencyMs: nullableNumber(network.latencyMs), reconnects: nullableNumber(network.reconnects), lastError: nullableString(network.lastError) },
    events: events.slice(0, 100).flatMap((event) => { const e = objectOrEmpty(event); const at = nullableString(e.at); const severity = e.severity === "warning" || e.severity === "error" || e.severity === "info" ? e.severity : null; const source = nullableString(e.source); const message = nullableString(e.message); return at && severity && source && message ? [{ at, severity, source, message }] : []; }),
    financial: { btcEarned: nullableNumber(financial.btcEarned), electricityCost: nullableNumber(financial.electricityCost), profitLoss: nullableNumber(financial.profitLoss), verified: Boolean(financial.verified) },
  };
}

export function formatMetric(value: number | null, suffix = ""): string {
  return value === null ? "N/A" : `${value}${suffix}`;
}
