import net from "node:net";
import type { MinerAdapter } from "../modules/miner";
import type { MinerTelemetry } from "../modules/miner";

interface CgMinerOptions {
  host: string;
  port: number;
  username: string;
  password: string;
  minerId?: string;
  model?: string;
  timeoutMs?: number;
}

type CgResponse = Record<string, unknown>;

export class CgMinerAdapter implements MinerAdapter {
  private connected = false;
  private readonly options: Required<CgMinerOptions>;

  constructor(options: CgMinerOptions) {
    this.options = {
      host: options.host,
      port: options.port,
      username: options.username,
      password: options.password,
      minerId: options.minerId ?? options.host,
      model: options.model ?? "CGMiner-compatible ASIC",
      timeoutMs: options.timeoutMs ?? 5000,
    };
  }

  async connect(): Promise<void> {
    const response = await this.request("summary");
    if (typeof response.STATUS !== "object" || !response.STATUS) throw new Error("Invalid miner API response");
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async getTelemetry(): Promise<MinerTelemetry> {
    const response = await this.request("summary");
    const summary = Array.isArray(response.SUMMARY) ? response.SUMMARY[0] as Record<string, unknown> : {};
    const hashrate = Number(summary["GHS av"] ?? summary["MHS av"] ?? 0);
    const hps = Number(summary["GHS av"] ?? 0) > 0 ? hashrate * 1e9 : hashrate * 1e6;
    const accepted = Number(summary["Accepted"] ?? 0);
    const rejected = Number(summary["Rejected"] ?? 0);
    if (!Number.isFinite(hps) || hps <= 0) throw new Error("Miner returned no positive hashrate");
    this.connected = true;
    return {
      minerId: this.options.minerId,
      model: this.options.model,
      connection: "connected",
      hashrateHps: hps,
      temperatureC: Number(summary["Temperature"] ?? 0),
      powerWatts: Number(summary["Power"] ?? 0),
      acceptedShares: Math.max(0, accepted),
      rejectedShares: Math.max(0, rejected),
      observedAt: new Date().toISOString(),
    };
  }

  private request(command: string): Promise<CgResponse> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: this.options.host, port: this.options.port });
      let buffer = "";
      const timer = setTimeout(() => { socket.destroy(); reject(new Error("Miner API timeout")); }, this.options.timeoutMs);
      socket.setEncoding("utf8");
      socket.on("connect", () => {
        socket.write(JSON.stringify({ command, parameter: "" }) + "\n");
      });
      socket.on("data", chunk => { buffer += chunk; });
      socket.on("error", err => { clearTimeout(timer); reject(err); });
      socket.on("end", () => {
        clearTimeout(timer);
        try { resolve(JSON.parse(buffer) as CgResponse); } catch { reject(new Error("Invalid miner JSON response")); }
      });
      socket.on("close", () => {
        clearTimeout(timer);
        if (buffer) {
          try { resolve(JSON.parse(buffer) as CgResponse); } catch {}
        }
      });
    });
  }
}
