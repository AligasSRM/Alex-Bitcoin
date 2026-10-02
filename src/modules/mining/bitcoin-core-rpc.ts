import { BitcoinCoreBoundary, BitcoinCoreMiningTemplate } from "./bitcoin-core-boundary";
import { assembleBitcoinBlock, BitcoinBlockHeaderFields } from "./block-assembly";
import { sha256d } from "./sha256d";

interface JsonRpcResponse<T> {
  result?: T;
  error?: { code?: number; message?: string };
  id?: number;
}

interface GetBlockTemplateResult {
  version: number;
  previousblockhash: string;
  transactions: Array<{ data: string; txid?: string }>;
  coinbasetxn: { data: string };
  target: string;
  bits: string;
  curtime: number;
}

export interface BitcoinCoreRpcConfig {
  url: string;
  username: string;
  password: string;
  fetchImpl?: typeof fetch;
}

function requireHex(value: unknown, bytes?: number): string {
  if (typeof value !== "string" || !/^[0-9a-fA-F]+$/.test(value) || value.length % 2 !== 0) {
    throw new Error("invalid hex");
  }
  if (bytes !== undefined && value.length !== bytes * 2) throw new Error("invalid hex length");
  return value.toLowerCase();
}

function uint32le(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error("uint32 out of range");
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value, true);
  return out;
}

function reverseHex(value: string): string {
  return Buffer.from(value, "hex").reverse().toString("hex");
}

function buildHeaderPrefix76(fields: BitcoinBlockHeaderFields): Uint8Array {
  const previous = Buffer.from(reverseHex(fields.previousBlockHashHex), "hex");
  const merkle = Buffer.from(reverseHex(fields.merkleRootHex), "hex");
  return Uint8Array.from(Buffer.concat([
    Buffer.from(uint32le(fields.version)),
    previous,
    merkle,
    Buffer.from(uint32le(fields.time)),
    Buffer.from(uint32le(fields.bits)),
  ]));
}

export class BitcoinCoreRpcClient implements BitcoinCoreBoundary {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: BitcoinCoreRpcConfig) {
    if (!/^https?:\/\//.test(config.url)) throw new Error("invalid Bitcoin Core RPC URL");
    if (!config.username || !config.password) throw new Error("Bitcoin Core RPC credentials are required");
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  private async call<T>(method: string, params: unknown[] = []): Promise<T> {
    const response = await this.fetchImpl(this.config.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64")}`,
      },
      body: JSON.stringify({ jsonrpc: "1.0", id: 1, method, params }),
    });
    if (!response.ok) throw new Error(`Bitcoin Core RPC HTTP ${response.status}`);
    const payload = await response.json() as JsonRpcResponse<T>;
    if (payload.error) throw new Error(payload.error.message ?? "Bitcoin Core RPC error");
    if (payload.result === undefined) throw new Error("Bitcoin Core RPC response missing result");
    return payload.result;
  }

  async getBlockTemplate(): Promise<BitcoinCoreMiningTemplate> {
    const gbt = await this.call<GetBlockTemplateResult>("getblocktemplate", [{ rules: ["segwit"] }]);
    requireHex(gbt.previousblockhash, 32);
    requireHex(gbt.target, 32);
    requireHex(gbt.bits, 4);
    if (!Number.isInteger(gbt.version) || !Number.isInteger(gbt.curtime)) throw new Error("invalid getblocktemplate header fields");
    requireHex(gbt.coinbasetxn?.data);
    if (!Array.isArray(gbt.transactions)) throw new Error("invalid getblocktemplate transactions");

    const transactions = [gbt.coinbasetxn.data, ...gbt.transactions.map((tx) => requireHex(tx.data))];
    const merkleRootHex = assembleBitcoinBlock({
      header: {
        version: gbt.version,
        previousBlockHashHex: gbt.previousblockhash,
        merkleRootHex: (() => {
          const layer = transactions.map((tx) => sha256d(Buffer.from(tx, "hex")));
          let current = layer;
          while (current.length > 1) {
            const next: Uint8Array[] = [];
            for (let i = 0; i < current.length; i += 2) {
              const right = current[i + 1] ?? current[i];
              next.push(sha256d(Buffer.concat([Buffer.from(current[i]), Buffer.from(right)])));
            }
            current = next;
          }
          return Buffer.from(current[0]).reverse().toString("hex");
        })(),
        time: gbt.curtime,
        bits: Number.parseInt(gbt.bits, 16),
        nonce: 0,
      },
      coinbaseTransactionHex: gbt.coinbasetxn.data,
      transactionHexes: gbt.transactions.map((tx) => tx.data),
    }).merkleRootHex;

    const header: BitcoinBlockHeaderFields = {
      version: gbt.version,
      previousBlockHashHex: gbt.previousblockhash,
      merkleRootHex,
      time: gbt.curtime,
      bits: Number.parseInt(gbt.bits, 16),
      nonce: 0,
    };

    return {
      jobId: `${gbt.previousblockhash}:${gbt.curtime}`,
      headerPrefix76: buildHeaderPrefix76(header),
      targetHex: gbt.target,
      createdAt: new Date().toISOString(),
    };
  }

  async submitBlock(blockHex: string): Promise<"accepted" | "rejected"> {
    requireHex(blockHex);
    if (blockHex.length < 160) return "rejected";
    const result = await this.call<null | string>("submitblock", [blockHex]);
    return result === null ? "accepted" : "rejected";
  }
}
