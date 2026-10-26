import { describe, expect, it } from "vitest";
import {
  levelFromXp,
  levelProgress,
  xpForLevel,
  xpToNextLevel,
} from "./gamification";

describe("gamification", () => {
  it("calculates level thresholds", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(3)).toBe(400);
  });

  it("derives level from xp", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(399)).toBe(2);
    expect(levelFromXp(400)).toBe(3);
  });

  it("computes progress within level", () => {
    expect(levelProgress(0)).toBe(0);
    expect(levelProgress(50)).toBeGreaterThan(0);
    expect(levelProgress(50)).toBeLessThan(1);
  });

  it("computes xp to next level", () => {
    expect(xpToNextLevel(0)).toBe(100);
    expect(xpToNextLevel(100)).toBe(300);
  });
});
