import type { CoreDependencies } from "./application";
import { calculateDailyProfitability } from "../modules/profitability";
import { createAlert, type Alert } from "../modules/alerts";
import { safeCall } from "../services/safe-call";

export interface CoreHealthSnapshot {
  collectedAt: string;
  miner: Awaited<ReturnType<CoreDependencies["miner"]["getTelemetry"]>> | null;
  pool: Awaited<ReturnType<CoreDependencies["pool"]["getTelemetry"]>> | null;
  wallet: Awaited<ReturnType<CoreDependencies["wallet"]["getStatus"]>> | null;
  profitability: ReturnType<typeof calculateDailyProfitability> | null;
  alerts: Alert[];
}

export async function collectCoreHealthSnapshot(deps: CoreDependencies): Promise<CoreHealthSnapshot> {
  const [miner, pool, wallet] = await Promise.all([
    safeCall(() => deps.miner.getTelemetry()),
    safeCall(() => deps.pool.getTelemetry()),
    safeCall(() => deps.wallet.getStatus()),
  ]);

  const alerts: Alert[] = [];
  const observedAt = new Date().toISOString();

  if (!miner.ok) alerts.push(createAlert({
    source: "miner",
    severity: "critical",
    code: "MINER_UNAVAILABLE",
    message: "Miner telemetry is unavailable",
    observedAt,
  }));
  if (!pool.ok) alerts.push(createAlert({
    source: "pool",
    severity: "critical",
    code: "POOL_UNAVAILABLE",
    message: "Pool telemetry is unavailable",
    observedAt,
  }));
  if (!wallet.ok) alerts.push(createAlert({
    source: "wallet",
    severity: "critical",
    code: "WALLET_UNAVAILABLE",
    message: "Wallet status is unavailable",
    observedAt,
  }));

  let profitability: CoreHealthSnapshot["profitability"] = null;
  if (miner.ok) {
    profitability = calculateDailyProfitability({
      ...deps.profitabilityInput,
      hashrateHps: miner.value.hashrateHps,
      powerWatts: miner.value.powerWatts,
    });
  } else {
    alerts.push(createAlert({
      source: "profitability",
      severity: "warning",
      code: "PROFITABILITY_UNAVAILABLE",
      message: "Profitability cannot be calculated without verified miner telemetry",
      observedAt,
    }));
  }

  return {
    collectedAt: observedAt,
    miner: miner.ok ? miner.value : null,
    pool: pool.ok ? pool.value : null,
    wallet: wallet.ok ? wallet.value : null,
    profitability,
    alerts,
  };
}
