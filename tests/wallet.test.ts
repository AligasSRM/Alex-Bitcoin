import { validateWalletStatus } from "../src/modules/wallet";

const status = {
  walletId: "TEST-WALLET",
  network: "bitcoin-testnet" as const,
  payoutAddress: "TEST_ADDRESS",
  confirmedSats: 150_000,
  pendingSats: 25_000,
  observedAt: new Date().toISOString(),
};

validateWalletStatus(status);

let rejected = false;
try {
  validateWalletStatus({ ...status, pendingSats: -1 });
} catch {
  rejected = true;
}

if (!rejected) throw new Error("negative pending balance was not rejected");

console.log("wallet core tests passed");
