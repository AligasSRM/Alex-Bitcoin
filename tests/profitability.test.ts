import { calculateDailyProfitability } from "../src/modules/profitability";

const result = calculateDailyProfitability({
  hashrateHps: 100,
  powerWatts: 1000,
  btcPriceUsd: 100_000,
  btcPerHash: 0.000001,
  electricityUsdPerKwh: 0.10,
});

if (result.dailyBtc !== 8.64) throw new Error("daily BTC calculation failed");
if (result.dailyRevenueUsd !== 864_000) throw new Error("revenue calculation failed");
if (result.dailyElectricityCostUsd !== 2.4) throw new Error("electricity cost calculation failed");
if (result.dailyProfitUsd !== 863_997.6) throw new Error("profit calculation failed");

let rejected = false;
try {
  calculateDailyProfitability({ hashrateHps: 0, powerWatts: 1000, btcPriceUsd: 100_000, btcPerHash: 1e-9, electricityUsdPerKwh: 0.1 });
} catch {
  rejected = true;
}
if (!rejected) throw new Error("invalid profitability input was not rejected");

console.log("profitability core tests passed");
