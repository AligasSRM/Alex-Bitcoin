import type { ExternalAdapters } from "./adapters";
import { connectExternalAdapters, disconnectExternalAdapters } from "./lifecycle";
import { MiningControlBoundary, type MiningControlResult } from "./mining-control";

export class ProductionMiningControl {
  private readonly control: MiningControlBoundary;
  private connected = false;

  constructor(private readonly adapters: ExternalAdapters) {
    this.control = new MiningControlBoundary(adapters.miner);
  }

  getState() {
    return this.control.getState();
  }

  async start(): Promise<MiningControlResult> {
    if (this.connected) {
      return this.control.start();
    }

    const lifecycle = await connectExternalAdapters(this.adapters);
    if (!lifecycle.ok) {
      return {
        ok: false,
        state: this.control.getState(),
        reason: "external_adapter_connection_failed",
      };
    }

    this.connected = true;
    const result = await this.control.start();

    if (!result.ok) {
      await disconnectExternalAdapters(this.adapters);
      this.connected = false;
    }

    return result;
  }

  async stop(): Promise<MiningControlResult> {
    const result = await this.control.stop();

    if (result.ok && this.connected) {
      await disconnectExternalAdapters(this.adapters);
      this.connected = false;
    }

    return result;
  }
}
