import { validateProfitabilityInput, type ProfitabilityInput, type ProfitabilityResult } from "./types";

const HOURS_PER_DAY = 24;
const WATTS_PER_KW = 1000;

export function calculateDailyProfitability(input: ProfitabilityInput): ProfitabilityResult {
  validateProfitabilityInput(input);

  const dailyBtc = input.hashrateHps * 60 * 60 * HOURS_PER_DAY * input.btcPerHash;
  const dailyRevenueUsd = dailyBtc * input.btcPriceUsd;
  const dailyElectricityCostUsd =
    (input.powerWatts / WATTS_PER_KW) * HOURS_PER_DAY * input.electricityUsdPerKwh;

  return {
    dailyBtc,
    dailyRevenueUsd,
    dailyElectricityCostUsd,
    dailyProfitUsd: dailyRevenueUsd - dailyElectricityCostUsd,
  };
}
