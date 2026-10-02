import type { AppConfig } from "../core/config";
import { createExternalAdapters, type ExternalAdapters } from "./adapters";
import type { ProfitabilityInput } from "../modules/profitability";

export interface StartupGateInput {
  config: AppConfig;
  adapters: ExternalAdapters;
  profitabilityInput: ProfitabilityInput;
}

export function validateStartupGate(input: StartupGateInput): void {
  if (!input.config) throw new Error("Startup configuration is required");
  if (!input.adapters) throw new Error("External adapters are required");
  if (!input.profitabilityInput) throw new Error("Verified profitability input is required");

  createExternalAdapters(input.adapters);

  if (input.config.env === "production") {
    if (input.config.miner.host.trim() === "") throw new Error("Production miner host is required");
    if (input.config.pool.url.trim() === "") throw new Error("Production pool URL is required");
    if (input.config.wallet.btcPayoutAddress.trim() === "") {
      throw new Error("Production BTC payout address is required");
    }
  }
}
