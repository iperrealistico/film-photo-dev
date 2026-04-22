import { describe, expect, it } from "vitest";
import {
  clampGlobalTimeMultiplier,
  resolveEffectiveGlobalTimeMultiplier,
  resolveGlobalTimeNowMs,
  resolveScaledTimerIntervalMs,
  retuneGlobalTimeState,
  scaleAppDelayMs,
} from "./timeScale";

describe("timeScale", () => {
  it("keeps the effective multiplier at 1x while debug mode is off", () => {
    expect(
      resolveEffectiveGlobalTimeMultiplier({
        debugModeEnabled: false,
        globalTimeMultiplier: 8,
      }),
    ).toBe(1);
  });

  it("retunes the clock without jumping app time when the multiplier changes", () => {
    const current = {
      debugModeEnabled: true,
      globalTimeMultiplier: 2,
      globalTimeAnchorRealMs: 1_000,
      globalTimeAnchorAppMs: 1_000,
    };

    const beforeChange = resolveGlobalTimeNowMs(current, 4_000);
    const next = retuneGlobalTimeState(
      current,
      { globalTimeMultiplier: 5 },
      4_000,
    );
    const afterChange = resolveGlobalTimeNowMs(next, 4_000);

    expect(beforeChange).toBe(7_000);
    expect(afterChange).toBe(beforeChange);
  });

  it("scales delay math and refresh cadence for high multipliers", () => {
    expect(clampGlobalTimeMultiplier(0.04)).toBe(0.1);
    expect(scaleAppDelayMs(10_000, 10)).toBe(1_000);
    expect(resolveScaledTimerIntervalMs(10)).toBe(25);
  });
});
