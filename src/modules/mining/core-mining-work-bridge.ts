import type { BitcoinCoreMiningTemplate } from "./bitcoin-core-boundary";
import type { MiningWork } from "./types";

function targetHex(value: string): string {
  if (!/^[0-9a-fA-F]{64}$/.test(value)) throw new Error("invalid mining target");
  return value.toLowerCase();
}

function prefix76(value: Uint8Array): Uint8Array {
  if (value.length !== 76) throw new Error("Bitcoin header prefix must be 76 bytes");
  return new Uint8Array(value);
}

export function miningWorkFromBitcoinCoreTemplate(
  template: BitcoinCoreMiningTemplate,
  createdAt = template.createdAt,
): MiningWork {
  if (!template.jobId) throw new Error("Bitcoin Core template jobId is required");
  if (!createdAt) throw new Error("Bitcoin Core template createdAt is required");
  return {
    jobId: template.jobId,
    headerPrefix76: prefix76(template.headerPrefix76),
    nonceStart: 0,
    nonceEnd: 0xffffffff,
    targetHex: targetHex(template.targetHex),
    createdAt,
  };
}
