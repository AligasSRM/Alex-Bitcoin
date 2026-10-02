import { assertNonNegativeFinite, assertPositiveFinite } from "../../core/validation";

export interface ProfitabilityInput {
  hashrateHps: number;
  powerWatts: number;
  btcPriceUsd: number;
  btcPerHash: number;
  electricityUsdPerKwh: number;
}

export interface ProfitabilityResult {
  dailyBtc: number;
  dailyRevenueUsd: number;
  dailyElectricityCostUsd: number;
  dailyProfitUsd: number;
}

export function validateProfitabilityInput(value: ProfitabilityInput): void {
  assertPositiveFinite(value.hashrateHps, "hashrateHps");
  assertPositiveFinite(value.powerWatts, "powerWatts");
  assertPositiveFinite(value.btcPriceUsd, "btcPriceUsd");
  assertPositiveFinite(value.btcPerHash, "btcPerHash");
  assertNonNegativeFinite(value.electricityUsdPerKwh, "electricityUsdPerKwh");
}
