import type { WalletAdapter, WalletStatus } from "../modules/wallet";

export interface BitcoinAddressWalletOptions {
  address: string;
  network: "bitcoin-mainnet" | "bitcoin-testnet";
  apiBaseUrl: string;
  timeoutMs?: number;
}

export class BitcoinAddressWalletAdapter implements WalletAdapter {
  private readonly options: Required<BitcoinAddressWalletOptions>;
  constructor(options: BitcoinAddressWalletOptions) {
    this.options = { ...options, timeoutMs: options.timeoutMs ?? 5000 };
  }
  async getStatus(): Promise<WalletStatus> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const response = await fetch(`${this.options.apiBaseUrl.replace(/\/$/, "")}/address/${encodeURIComponent(this.options.address)}`, {
        signal: controller.signal,
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Wallet API HTTP ${response.status}`);
      const body = await response.json() as {
        chain_stats?: { funded_txo_sum?: number; spent_txo_sum?: number };
        mempool_stats?: { funded_txo_sum?: number; spent_txo_sum?: number };
      };
      const chain = body.chain_stats ?? {};
      const mempool = body.mempool_stats ?? {};
      const confirmedSats = Math.max(0, Number(chain.funded_txo_sum ?? 0) - Number(chain.spent_txo_sum ?? 0));
      const pendingSats = Number(mempool.funded_txo_sum ?? 0) - Number(mempool.spent_txo_sum ?? 0);
      if (!Number.isFinite(confirmedSats) || !Number.isFinite(pendingSats) || confirmedSats < 0 || pendingSats < 0) throw new Error("Wallet API returned invalid balance");
      return {
        walletId: this.options.address,
        network: this.options.network,
        payoutAddress: this.options.address,
        confirmedSats,
        pendingSats,
        observedAt: new Date().toISOString(),
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
