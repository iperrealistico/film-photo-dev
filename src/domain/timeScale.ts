export const defaultGlobalTimeMultiplier = 1;
export const minGlobalTimeMultiplier = 0.1;
export const maxGlobalTimeMultiplier = 10;
export const defaultScaledTimerIntervalMs = 250;
export const minScaledTimerIntervalMs = 25;

export interface GlobalTimeScaleState {
  debugModeEnabled: boolean;
  globalTimeMultiplier: number;
  globalTimeAnchorRealMs: number;
  globalTimeAnchorAppMs: number;
}

export function clampGlobalTimeMultiplier(rawValue: number) {
  if (!Number.isFinite(rawValue)) {
    return defaultGlobalTimeMultiplier;
  }

  return Math.min(
    maxGlobalTimeMultiplier,
    Math.max(
      minGlobalTimeMultiplier,
      Math.round(rawValue * 10) / 10,
    ),
  );
}

export function resolveEffectiveGlobalTimeMultiplier(
  state: Pick<GlobalTimeScaleState, "debugModeEnabled" | "globalTimeMultiplier">,
) {
  return state.debugModeEnabled
    ? clampGlobalTimeMultiplier(state.globalTimeMultiplier)
    : defaultGlobalTimeMultiplier;
}

export function resolveGlobalTimeNowMs(
  state: GlobalTimeScaleState,
  realNowMs = Date.now(),
) {
  return (
    state.globalTimeAnchorAppMs +
    (realNowMs - state.globalTimeAnchorRealMs) *
      resolveEffectiveGlobalTimeMultiplier(state)
  );
}

export function scaleAppDelayMs(
  appDelayMs: number,
  effectiveMultiplier: number,
) {
  if (!Number.isFinite(appDelayMs) || appDelayMs <= 0) {
    return 0;
  }

  return Math.max(0, appDelayMs / effectiveMultiplier);
}

export function resolveScaledTimerIntervalMs(effectiveMultiplier: number) {
  if (!Number.isFinite(effectiveMultiplier) || effectiveMultiplier <= 0) {
    return defaultScaledTimerIntervalMs;
  }

  return Math.max(
    minScaledTimerIntervalMs,
    Math.min(
      defaultScaledTimerIntervalMs,
      scaleAppDelayMs(defaultScaledTimerIntervalMs, effectiveMultiplier),
    ),
  );
}

export function retuneGlobalTimeState<T extends GlobalTimeScaleState>(
  currentState: T,
  nextStatePatch: Partial<
    Pick<T, "debugModeEnabled" | "globalTimeMultiplier">
  >,
  realNowMs = Date.now(),
): T {
  const nextState = {
    ...currentState,
    ...nextStatePatch,
  };
  const appNowMs = resolveGlobalTimeNowMs(currentState, realNowMs);

  return {
    ...nextState,
    globalTimeAnchorRealMs: realNowMs,
    globalTimeAnchorAppMs: appNowMs,
  };
}
