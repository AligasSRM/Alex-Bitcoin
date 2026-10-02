import { createHash } from "node:crypto";

export function sha256d(data: Uint8Array): Uint8Array {
  const first = createHash("sha256").update(data).digest();
  return createHash("sha256").update(first).digest();
}

export function serializeHeaderWithNonce(headerPrefix76: Uint8Array, nonce: number): Uint8Array {
  if (headerPrefix76.byteLength !== 76) throw new Error("Bitcoin header prefix must be exactly 76 bytes");
  if (!Number.isInteger(nonce) || nonce < 0 || nonce > 0xffffffff) {
    throw new Error("nonce must be an unsigned 32-bit integer");
  }
  const header = new Uint8Array(80);
  header.set(headerPrefix76, 0);
  new DataView(header.buffer).setUint32(76, nonce, true);
  return header;
}

export function hashHeader(headerPrefix76: Uint8Array, nonce: number): Uint8Array {
  return sha256d(serializeHeaderWithNonce(headerPrefix76, nonce));
}

export function hashToDisplayHex(hash: Uint8Array): string {
  return Buffer.from(hash).reverse().toString("hex");
}

export function hashMeetsTarget(hash: Uint8Array, targetHex: string): boolean {
  if (!/^[0-9a-fA-F]{64}$/.test(targetHex)) throw new Error("targetHex must be a 32-byte hex value");
  const hashInt = BigInt("0x" + Buffer.from(hash).reverse().toString("hex"));
  const targetInt = BigInt("0x" + targetHex);
  return hashInt <= targetInt;
}
