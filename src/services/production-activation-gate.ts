export interface ProductionActivationInput {
  env: "development" | "test" | "production";
  minerConfigured: boolean;
  minerConnected: boolean;
  poolConfigured: boolean;
  poolConnected: boolean;
  walletConfigured: boolean;
  walletReachable: boolean;
}

export interface ProductionActivationResult {
  enabled: boolean;
  reasons: string[];
}

export function evaluateProductionActivation(
  input: ProductionActivationInput,
): ProductionActivationResult {
  const reasons: string[] = [];

  if (input.env !== "production") reasons.push("production_environment_required");
  if (!input.minerConfigured) reasons.push("miner_configuration_missing");
  if (!input.minerConnected) reasons.push("miner_not_connected");
  if (!input.poolConfigured) reasons.push("pool_configuration_missing");
  if (!input.poolConnected) reasons.push("pool_not_connected");
  if (!input.walletConfigured) reasons.push("wallet_configuration_missing");
  if (!input.walletReachable) reasons.push("wallet_not_reachable");

  return { enabled: reasons.length === 0, reasons };
}
