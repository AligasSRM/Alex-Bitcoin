import { assertNonEmpty, assertNonNegativeFinite } from "../../core/validation";

export type WalletNetwork = "bitcoin-mainnet" | "bitcoin-testnet";

export interface WalletStatus {
  walletId: string;
  network: WalletNetwork;
  payoutAddress: string;
  confirmedSats: number;
  pendingSats: number;
  observedAt: string;
}

export function validateWalletStatus(value: WalletStatus): void {
  assertNonEmpty(value.walletId, "walletId");
  assertNonEmpty(value.payoutAddress, "payoutAddress");
  assertNonNegativeFinite(value.confirmedSats, "confirmedSats");
  assertNonNegativeFinite(value.pendingSats, "pendingSats");

  if (!["bitcoin-mainnet", "bitcoin-testnet"].includes(value.network)) {
    throw new Error("Invalid Bitcoin wallet network");
  }

  if (Number.isNaN(Date.parse(value.observedAt))) {
    throw new Error("observedAt must be a valid ISO timestamp");
  }
}
