import type { AppConfig } from "../core/config";
import type { CoreDependencies } from "../core/application";
import type { ProfitabilityInput } from "../modules/profitability";
import type { ExternalAdapters } from "./adapters";

export interface Runtime {
  config: AppConfig;
  core: CoreDependencies;
}

export function createRuntime(
  config: AppConfig,
  adapters: ExternalAdapters,
  profitabilityInput: ProfitabilityInput,
): Runtime {
  if (!config || !adapters || !profitabilityInput) {
    throw new Error("Runtime requires verified configuration, adapters, and profitability input");
  }

  return {
    config,
    core: {
      miner: adapters.miner,
      pool: adapters.pool,
      wallet: adapters.wallet,
      profitabilityInput,
    },
  };
}
