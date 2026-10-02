import type { WalletStatus } from "./types";

export interface WalletAdapter {
  getStatus(): Promise<WalletStatus>;
}
