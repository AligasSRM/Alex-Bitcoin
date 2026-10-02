import type { MinerAdapter } from "../modules/miner";
import type { PoolAdapter } from "../modules/pool";
import type { WalletAdapter } from "../modules/wallet";

export interface ExternalAdapters {
  miner: MinerAdapter;
  pool: PoolAdapter;
  wallet: WalletAdapter;
}

/**
 * Production adapters are supplied by the deployment/runtime.
 * This layer intentionally contains no fake provider and no hard-coded credentials.
 */
export function createExternalAdapters(adapters: ExternalAdapters): ExternalAdapters {
  if (!adapters.miner || !adapters.pool || !adapters.wallet) {
    throw new Error("All external adapters are required");
  }

  return adapters;
}
