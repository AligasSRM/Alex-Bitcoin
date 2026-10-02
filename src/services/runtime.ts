import type { AppConfig } from "../core/config";
import type { CoreDependencies } from "../core/application";
import type { ExternalAdapters } from "./adapters";

export interface Runtime {
  config: AppConfig;
  core: CoreDependencies;
}

export function createRuntime(config: AppConfig, adapters: ExternalAdapters): Runtime {
  if (!config || !adapters) {
    throw new Error("Runtime requires verified configuration and external adapters");
  }

  return {
    config,
    core: {
      miner: adapters.miner,
      pool: adapters.pool,
      wallet: adapters.wallet,
      profitabilityInput: {
        hashrateHps: 1,
        powerWatts: 1,
        btcPriceUsd: 1,
        btcPerHash: 1,
        electricityUsdPerKwh: 0,
      },
    },
  };
}
