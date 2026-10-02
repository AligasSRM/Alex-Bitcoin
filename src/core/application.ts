import type { MinerAdapter, MinerTelemetry } from "../modules/miner";
import type { PoolAdapter, PoolTelemetry } from "../modules/pool";
import type { WalletAdapter, WalletStatus } from "../modules/wallet";
import { calculateDailyProfitability, type ProfitabilityInput, type ProfitabilityResult } from "../modules/profitability";
import { createAlert, type Alert, type AlertInput } from "../modules/alerts";

export interface CoreSnapshot {
  miner: MinerTelemetry;
  pool: PoolTelemetry;
  wallet: WalletStatus;
  profitability: ProfitabilityResult;
  alerts: Alert[];
}

export interface CoreDependencies {
  miner: MinerAdapter;
  pool: PoolAdapter;
  wallet: WalletAdapter;
  profitabilityInput: ProfitabilityInput;
}

export async function collectCoreSnapshot(deps: CoreDependencies, alerts: AlertInput[] = []): Promise<CoreSnapshot> {
  const [miner, pool, wallet] = await Promise.all([
    deps.miner.getTelemetry(),
    deps.pool.getTelemetry(),
    deps.wallet.getStatus(),
  ]);

  return {
    miner,
    pool,
    wallet,
    profitability: calculateDailyProfitability({
      ...deps.profitabilityInput,
      hashrateHps: miner.hashrateHps,
      powerWatts: miner.powerWatts,
    }),
    alerts: alerts.map(createAlert),
  };
}
