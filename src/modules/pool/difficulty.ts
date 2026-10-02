const DIFFICULTY_SCALE = 1_000_000_000_000n;
const DIFFICULTY_1_TARGET = BigInt("0x00000000ffff0000000000000000000000000000000000000000000000000000");
const MAX_TARGET_HEX = "00000000ffff0000000000000000000000000000000000000000000000000000";

function difficultyNumerator(difficulty: number): bigint {
  if (!Number.isFinite(difficulty) || difficulty <= 0) {
    throw new Error("difficulty must be positive and finite");
  }
  const scaled = Math.round(difficulty * Number(DIFFICULTY_SCALE));
  if (!Number.isSafeInteger(scaled) || scaled <= 0) {
    throw new Error("difficulty is outside supported precision");
  }
  return BigInt(scaled);
}

export function difficultyToTargetHex(difficulty: number): string {
  const scaledDifficulty = difficultyNumerator(difficulty);
  const rawTarget = (DIFFICULTY_1_TARGET * DIFFICULTY_SCALE) / scaledDifficulty;
  const target = rawTarget > DIFFICULTY_1_TARGET ? DIFFICULTY_1_TARGET : rawTarget;
  return target.toString(16).padStart(64, "0");
}

export function targetHexToDifficulty(targetHex: string): number {
  if (!/^[0-9a-fA-F]{64}$/.test(targetHex)) {
    throw new Error("targetHex must be exactly 32 bytes of hex");
  }

  const target = BigInt("0x" + targetHex);
  if (target <= 0n) throw new Error("targetHex must be positive");

  if (target >= DIFFICULTY_1_TARGET) return 1;

  return Number((DIFFICULTY_1_TARGET * DIFFICULTY_SCALE) / target) / Number(DIFFICULTY_SCALE);
}

export function difficulty1TargetHex(): string {
  return MAX_TARGET_HEX;
}
