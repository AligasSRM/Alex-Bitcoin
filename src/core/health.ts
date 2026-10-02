import type { CoreDependencies } from "./application";
import { calculateDailyProfitability } from "../modules/profitability";
import { createAlert, type Alert } from "../modules/alerts";
import { validateMinerTelemetry } from "../modules/miner";
import { validatePoolTelemetry } from "../modules/pool";
import { validateWalletStatus } from "../modules/wallet";
import { safeCall, type SafeCallOptions } from "../services/safe-call";

export interface CoreHealthSnapshot {
  collectedAt: string;
  miner: Awaited<ReturnType<CoreDependencies["miner"]["getTelemetry"]>> | null;
  pool: Awaited<ReturnType<CoreDependencies["pool"]["getTelemetry"]>> | null;
  wallet: Awaited<ReturnType<CoreDependencies["wallet"]["getStatus"]>> | null;
  profitability: ReturnType<typeof calculateDailyProfitability> | null;
  alerts: Alert[];
}

function validated<T>(
  read: () => Promise<T>,
  validate: (value: T) => void,
  options?: Partial<SafeCallOptions>,
) {
  return safeCall(async () => {
    const value = await read();
    validate(value);
    return value;
  }, options);
}

export async function collectCoreHealthSnapshot(
  deps: CoreDependencies,
  options: Partial<SafeCallOptions> = {},
): Promise<CoreHealthSnapshot> {
  const [miner, pool, wallet] = await Promise.all([
    validated(() => deps.miner.getTelemetry(), validateMinerTelemetry, options),
    validated(() => deps.pool.getTelemetry(), validatePoolTelemetry, options),
    validated(() => deps.wallet.getStatus(), validateWalletStatus, options),
  ]);

  const alerts: Alert[] = [];
  const observedAt = new Date().toISOString();

  if (!miner.ok) alerts.push(createAlert({
    source: "miner",
    severity: "critical",
    code: miner.code === "TIMEOUT" ? "MINER_TIMEOUT" : "MINER_UNAVAILABLE",
    message: miner.code === "TIMEOUT" ? "Miner telemetry timed out" : "Miner telemetry is unavailable",
    observedAt,
  }));

  if (!pool.ok) alerts.push(createAlert({
    source: "pool",
    severity: "critical",
    code: pool.code === "TIMEOUT" ? "POOL_TIMEOUT" : "POOL_UNAVAILABLE",
    message: pool.code === "TIMEOUT" ? "Pool telemetry timed out" : "Pool telemetry is unavailable",
    observedAt,
  }));

  if (!wallet.ok) alerts.push(createAlert({
    source: "wallet",
    severity: "critical",
    code: wallet.code === "TIMEOUT" ? "WALLET_TIMEOUT" : "WALLET_UNAVAILABLE",
    message: wallet.code === "TIMEOUT" ? "Wallet status timed out" : "Wallet status is unavailable",
    observedAt,
  }));

  let profitability: CoreHealthSnapshot["profitability"] = null;

  if (miner.ok) {
    try {
      profitability = calculateDailyProfitability({
        ...deps.profitabilityInput,
        hashrateHps: miner.value.hashrateHps,
        powerWatts: miner.value.powerWatts,
      });
    } catch {
      alerts.push(createAlert({
        source: "profitability",
        severity: "warning",
        code: "PROFITABILITY_INVALID",
        message: "Profitability cannot be calculated from the verified inputs",
        observedAt,
      }));
    }
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
