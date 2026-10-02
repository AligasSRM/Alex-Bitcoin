import type { PoolAdapter, PoolTelemetry } from "../modules/pool";

export interface HttpPoolOptions {
  telemetryUrl: string;
  poolId: string;
  endpoint: string;
  timeoutMs?: number;
}

export class HttpPoolAdapter implements PoolAdapter {
  private readonly options: Required<HttpPoolOptions>;
  constructor(options: HttpPoolOptions) {
    this.options = {
      ...options,
      timeoutMs: options.timeoutMs ?? 5000,
    };
  }
  async connect(): Promise<void> {
    await this.getTelemetry();
  }
  async disconnect(): Promise<void> {}
  async getTelemetry(): Promise<PoolTelemetry> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const response = await fetch(this.options.telemetryUrl, { signal: controller.signal, headers: { accept: "application/json" } });
      if (!response.ok) throw new Error(`Pool telemetry HTTP ${response.status}`);
      const body = await response.json() as Record<string, unknown>;
      const telemetry: PoolTelemetry = {
        poolId: this.options.poolId,
        endpoint: this.options.endpoint,
        connection: "connected",
        reportedHashrateHps: Number(body.reportedHashrateHps),
        acceptedShares: Number(body.acceptedShares),
        rejectedShares: Number(body.rejectedShares),
        observedAt: typeof body.observedAt === "string" ? body.observedAt : new Date().toISOString(),
      };
      if (!Number.isFinite(telemetry.reportedHashrateHps) || telemetry.reportedHashrateHps <= 0) throw new Error("Pool returned invalid hashrate");
      if (!Number.isFinite(telemetry.acceptedShares) || telemetry.acceptedShares < 0) throw new Error("Pool returned invalid accepted shares");
      if (!Number.isFinite(telemetry.rejectedShares) || telemetry.rejectedShares < 0) throw new Error("Pool returned invalid rejected shares");
      return telemetry;
    } finally {
      clearTimeout(timer);
    }
  }
}
