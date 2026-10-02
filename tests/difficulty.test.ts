import { difficulty1TargetHex, difficultyToTargetHex, targetHexToDifficulty } from "../src/modules/pool/difficulty";

const maxTarget = difficulty1TargetHex();
if (maxTarget !== "00000000ffff0000000000000000000000000000000000000000000000000000") {
  throw new Error("difficulty-1 target constant mismatch");
}

if (difficultyToTargetHex(1) !== maxTarget) {
  throw new Error("difficulty 1 target conversion mismatch");
}

const higherDifficultyTarget = difficultyToTargetHex(32.5);
if (BigInt("0x" + higherDifficultyTarget) >= BigInt("0x" + maxTarget)) {
  throw new Error("higher difficulty did not produce a harder target");
}

const roundTrip = targetHexToDifficulty(higherDifficultyTarget);
if (Math.abs(roundTrip - 32.5) > 0.00000001) {
  throw new Error("difficulty target round trip drifted");
}

if (difficultyToTargetHex(0.5) !== maxTarget) {
  throw new Error("sub-difficulty target was not bounded to the Bitcoin difficulty-1 target");
}

for (const invalid of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
  let rejected = false;
  try {
    difficultyToTargetHex(invalid);
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error("invalid difficulty was accepted");
}

for (const invalidTarget of ["", "00", "zz".repeat(32), "00".repeat(32)]) {
  let rejected = false;
  try {
    targetHexToDifficulty(invalidTarget);
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error("invalid target was accepted");
}

console.log("difficulty target boundary tests passed");
