import type { ExternalAdapters } from "./adapters";
import { safeCall } from "./safe-call";

export interface LifecycleResult {
  ok: boolean;
  connected: {
    miner: boolean;
    pool: boolean;
    wallet: boolean;
  };
}

export async function connectExternalAdapters(adapters: ExternalAdapters): Promise<LifecycleResult> {
  const connected = { miner: false, pool: false, wallet: false };

  const miner = await safeCall(() => adapters.miner.connect());
  if (!miner.ok) return { ok: false, connected };

  connected.miner = true;

  const pool = await safeCall(() => adapters.pool.connect());
  if (!pool.ok) {
    await safeCall(() => adapters.miner.disconnect());
    connected.miner = false;
    return { ok: false, connected };
  }

  connected.pool = true;

  const wallet = await safeCall(() => adapters.wallet.getStatus());
  if (!wallet.ok) {
    await safeCall(() => adapters.pool.disconnect());
    await safeCall(() => adapters.miner.disconnect());
    connected.pool = false;
    connected.miner = false;
    return { ok: false, connected };
  }

  connected.wallet = true;
  return { ok: true, connected };
}

export async function disconnectExternalAdapters(adapters: ExternalAdapters): Promise<void> {
  await safeCall(() => adapters.miner.disconnect());
  await safeCall(() => adapters.pool.disconnect());
}
