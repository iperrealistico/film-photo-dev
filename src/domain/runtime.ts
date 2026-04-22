import type {
  ActiveSessionState,
  RuntimeFrame,
  SessionEvent,
  SessionPlan,
  SessionStatus,
} from "./types";

function createEvent(type: SessionEvent["type"], detail: string): SessionEvent {
  return {
    id: `${type}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    detail,
    at: new Date().toISOString(),
  };
}

function appendEvent(
  state: ActiveSessionState,
  type: SessionEvent["type"],
  detail: string,
): ActiveSessionState {
  return {
    ...state,
    eventLog: [...state.eventLog, createEvent(type, detail)],
  };
}

export function createActiveSession(plan: SessionPlan, nowMs: number) {
  return {
    sessionId: `session-${Math.random().toString(36).slice(2, 10)}`,
    planId: plan.id,
    status: "ready" as SessionStatus,
    startEpochMs: null,
    scheduledStartAtMs: null,
    pauseStartedAtMs: null,
    totalPausedMs: 0,
    createdAtMs: nowMs,
    lastPersistedAtMs: nowMs,
    uncertaintyMs: 0,
    resumeStatus: "running" as const,
    completedManualPhaseIds: [],
    eventLog: [
      createEvent("created", "Session prepared from the review screen."),
    ],
  };
}

export function hydrateActiveSession(
  snapshot: ActiveSessionState,
  nowMs: number,
): ActiveSessionState {
  const hydratedBase = {
    ...snapshot,
    completedManualPhaseIds: snapshot.completedManualPhaseIds ?? [],
  };

  if (snapshot.status === "running" || snapshot.status === "paused") {
    const uncertaintyMs = Math.max(0, nowMs - snapshot.lastPersistedAtMs);

    return appendEvent(
      {
        ...hydratedBase,
        status: "recovering",
        recoveryNote:
          uncertaintyMs > 15000
            ? "The app was away for a while. Check the timer before you continue."
            : "Recovered a recent in-progress session.",
        uncertaintyMs,
        resumeStatus: snapshot.status,
      },
      "recovery_needed",
      "Recovered an in-progress session.",
    );
  }

  return hydratedBase;
}

export function startSession(state: ActiveSessionState, nowMs: number) {
  return appendEvent(
    {
      ...state,
      status: "running",
      startEpochMs: nowMs,
      scheduledStartAtMs: null,
      lastPersistedAtMs: nowMs,
    },
    "started",
    "Timer started.",
  );
}

export function pauseSession(state: ActiveSessionState, nowMs: number) {
  if (state.status !== "running") {
    return state;
  }

  return appendEvent(
    {
      ...state,
      status: "paused",
      pauseStartedAtMs: nowMs,
      lastPersistedAtMs: nowMs,
    },
    "paused",
    "Timer paused.",
  );
}

export function resumeSession(state: ActiveSessionState, nowMs: number) {
  if (state.status !== "paused") {
    return state;
  }

  const pauseDuration = state.pauseStartedAtMs
    ? nowMs - state.pauseStartedAtMs
    : 0;

  return appendEvent(
    {
      ...state,
      status: "running",
      pauseStartedAtMs: null,
      totalPausedMs: state.totalPausedMs + pauseDuration,
      lastPersistedAtMs: nowMs,
    },
    "resumed",
    "Timer resumed.",
  );
}

export function waitForPhaseConfirmation(
  state: ActiveSessionState,
  nowMs: number,
  phaseLabel: string,
) {
  if (state.status !== "running") {
    return state;
  }

  return appendEvent(
    {
      ...state,
      status: "awaiting_phase_start",
      pauseStartedAtMs: nowMs,
      lastPersistedAtMs: nowMs,
    },
    "phase_wait_started",
    `${phaseLabel} is lined up. Waiting for manual confirmation to start the timer.`,
  );
}

export function confirmPhaseStart(
  state: ActiveSessionState,
  nowMs: number,
  phaseLabel: string,
) {
  if (state.status !== "awaiting_phase_start") {
    return state;
  }

  const pauseDuration = state.pauseStartedAtMs
    ? nowMs - state.pauseStartedAtMs
    : 0;

  return appendEvent(
    {
      ...state,
      status: "running",
      pauseStartedAtMs: null,
      totalPausedMs: state.totalPausedMs + pauseDuration,
      lastPersistedAtMs: nowMs,
    },
    "phase_wait_confirmed",
    `${phaseLabel} started after manual confirmation.`,
  );
}

export function completeManualPhase(
  state: ActiveSessionState,
  nowMs: number,
  phaseId: string,
  phaseLabel: string,
) {
  if (state.status !== "awaiting_phase_start") {
    return state;
  }

  const pauseDuration = state.pauseStartedAtMs
    ? nowMs - state.pauseStartedAtMs
    : 0;
  const completedManualPhaseIds = Array.from(
    new Set([...(state.completedManualPhaseIds ?? []), phaseId]),
  );

  return appendEvent(
    {
      ...state,
      status: "running",
      pauseStartedAtMs: null,
      totalPausedMs: state.totalPausedMs + pauseDuration,
      completedManualPhaseIds,
      lastPersistedAtMs: nowMs,
    },
    "phase_wait_confirmed",
    `${phaseLabel} completed after manual confirmation.`,
  );
}

export function confirmRecovery(state: ActiveSessionState, nowMs: number) {
  const nextStatus = state.resumeStatus;

  return appendEvent(
    {
      ...state,
      status: nextStatus,
      uncertaintyMs: 0,
      recoveryNote: undefined,
      lastPersistedAtMs: nowMs,
    },
    "recovery_confirmed",
    "Recovery confirmed.",
  );
}

export function abortSession(state: ActiveSessionState, nowMs: number) {
  return appendEvent(
    {
      ...state,
      status: "aborted",
      lastPersistedAtMs: nowMs,
    },
    "aborted",
    "Session ended early.",
  );
}

export function completeSession(state: ActiveSessionState, nowMs: number) {
  return appendEvent(
    {
      ...state,
      status: "completed",
      lastPersistedAtMs: nowMs,
    },
    "completed",
    "Session finished.",
  );
}

export function markPersisted(state: ActiveSessionState, nowMs: number) {
  return {
    ...state,
    lastPersistedAtMs: nowMs,
  };
}

function getEffectiveElapsedMs(state: ActiveSessionState, nowMs: number) {
  if (!state.startEpochMs) {
    return 0;
  }

  if (state.status === "completed" || state.status === "aborted") {
    return Math.max(
      0,
      state.lastPersistedAtMs - state.startEpochMs - state.totalPausedMs,
    );
  }

  const activeNowMs =
    (state.status === "paused" || state.status === "awaiting_phase_start") &&
    state.pauseStartedAtMs
      ? state.pauseStartedAtMs
      : nowMs;

  return Math.max(0, activeNowMs - state.startEpochMs - state.totalPausedMs);
}

function getActiveCue(
  phase: SessionPlan["phaseList"][number],
  elapsedInPhaseSec: number,
) {
  return (
    [...phase.cueEvents].reverse().find((cue) => {
      if (!cue.durationSec || cue.durationSec <= 0) {
        return false;
      }

      return (
        cue.atSec <= elapsedInPhaseSec &&
        elapsedInPhaseSec < cue.atSec + cue.durationSec
      );
    }) ?? null
  );
}

export function deriveRuntimeFrame(
  plan: SessionPlan,
  state: ActiveSessionState,
  nowMs: number,
): RuntimeFrame {
  const elapsedSec = Math.floor(getEffectiveElapsedMs(state, nowMs) / 1000);
  const completedManualPhaseIds = new Set(state.completedManualPhaseIds ?? []);
  let cursor = 0;

  for (let index = 0; index < plan.phaseList.length; index += 1) {
    const phase = plan.phaseList[index];

    if (phase.timerMode === "manual") {
      if (!completedManualPhaseIds.has(phase.id) && elapsedSec >= cursor) {
        return {
          phaseIndex: index,
          currentPhase: phase,
          elapsedInPhaseSec: 0,
          remainingInPhaseSec: 0,
          totalElapsedSec: elapsedSec,
          activeCue: null,
          activeCueRemainingSec: null,
          nextCue: null,
          nextCueInSec: null,
          completed: false,
        };
      }

      continue;
    }

    const phaseStart = cursor;
    const phaseEnd = cursor + phase.durationSec;

    if (elapsedSec < phaseEnd) {
      const elapsedInPhaseSec = Math.max(0, elapsedSec - phaseStart);
      const remainingInPhaseSec = Math.max(
        0,
        phase.durationSec - elapsedInPhaseSec,
      );
      const activeCue = getActiveCue(phase, elapsedInPhaseSec);
      const nextCue =
        phase.cueEvents.find((cue) =>
          activeCue
            ? cue.atSec > elapsedInPhaseSec
            : cue.atSec >= elapsedInPhaseSec,
        ) ?? null;

      return {
        phaseIndex: index,
        currentPhase: phase,
        elapsedInPhaseSec,
        remainingInPhaseSec,
        totalElapsedSec: elapsedSec,
        activeCue,
        activeCueRemainingSec: activeCue
          ? Math.max(
              0,
              activeCue.atSec +
                (activeCue.durationSec ?? 0) -
                elapsedInPhaseSec,
            )
          : null,
        nextCue,
        nextCueInSec: nextCue
          ? Math.max(0, nextCue.atSec - elapsedInPhaseSec)
          : null,
        completed: false,
      };
    }

    cursor = phaseEnd;
  }

  return {
    phaseIndex: plan.phaseList.length - 1,
    currentPhase: null,
    elapsedInPhaseSec: 0,
    remainingInPhaseSec: 0,
    totalElapsedSec: elapsedSec,
    activeCue: null,
    activeCueRemainingSec: null,
    nextCue: null,
    nextCueInSec: null,
    completed: true,
  };
}
