import { calculateDailyProfitability } from "../src/modules/profitability";

const result = calculateDailyProfitability({
  hashrateHps: 100,
  powerWatts: 1000,
  btcPriceUsd: 100_000,
  btcPerHash: 0.000001,
  electricityUsdPerKwh: 0.10,
});

if (Math.abs(result.dailyBtc - 8.64) > 1e-12) throw new Error("daily BTC calculation failed");
if (Math.abs(result.dailyRevenueUsd - 864_000) > 1e-9) throw new Error("revenue calculation failed");
if (Math.abs(result.dailyElectricityCostUsd - 2.4) > 1e-12) throw new Error("electricity cost calculation failed");
if (Math.abs(result.dailyProfitUsd - 863_997.6) > 1e-9) throw new Error("profit calculation failed");

let rejected = false;
try {
  calculateDailyProfitability({ hashrateHps: 0, powerWatts: 1000, btcPriceUsd: 100_000, btcPerHash: 1e-9, electricityUsdPerKwh: 0.1 });
} catch {
  rejected = true;
}
if (!rejected) throw new Error("invalid profitability input was not rejected");

console.log("profitability core tests passed");
