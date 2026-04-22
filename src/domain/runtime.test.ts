import { describe, expect, it } from "vitest";
import type { ActiveSessionState, SessionPlan } from "./types";
import {
  abortSession,
  completeManualPhase,
  completeSession,
  confirmPhaseStart,
  confirmRecovery,
  createActiveSession,
  deriveRuntimeFrame,
  hydrateActiveSession,
  pauseSession,
  resumeSession,
  startSession,
  waitForPhaseConfirmation,
} from "./runtime";

const simplePlan: SessionPlan = {
  id: "plan-test",
  recipeId: "recipe-test",
  recipeName: "Test Recipe",
  processType: "bw",
  sourceSummary: "Test source",
  generatedAt: "2026-04-18T09:00:00.000Z",
  totalDurationSec: 45,
  phaseList: [
    {
      id: "developer",
      label: "Developer",
      kind: "developer",
      durationSec: 30,
      detail: "Develop.",
      cueEvents: [
        {
          id: "developer-prepare",
          atSec: 10,
          label: "Prepare to agitate",
          style: "soft",
        },
      ],
    },
    {
      id: "stop",
      label: "Stop",
      kind: "stop",
      durationSec: 15,
      detail: "Stop bath.",
      cueEvents: [],
    },
  ],
  calculationLines: [],
  calculationTrace: [],
  mixAmounts: [],
  blockingIssues: [],
  warnings: [],
  readinessChecklist: [],
  nextSteps: [],
  inputSnapshot: {},
};

function createRunningState() {
  return startSession(createActiveSession(simplePlan, 1_000), 1_000);
}

const manualPlan: SessionPlan = {
  ...simplePlan,
  id: "plan-manual",
  totalDurationSec: 30,
  phaseList: [
    simplePlan.phaseList[0],
    {
      id: "wash-step",
      label: "Minimal wash · 5 inversions",
      kind: "instruction",
      durationSec: 0,
      timerMode: "manual",
      detail: "Fill, invert, and drain.",
      cueEvents: [],
    },
  ],
};

const cueWindowPlan: SessionPlan = {
  ...simplePlan,
  id: "plan-cue-window",
  totalDurationSec: 180,
  phaseList: [
    {
      id: "monobath",
      label: "Monobath",
      kind: "developer",
      durationSec: 180,
      detail: "Df96 monobath.",
      cueEvents: [
        {
          id: "monobath-initial",
          atSec: 0,
          durationSec: 30,
          label: "Agitate continuously for 30 sec",
          style: "strong",
        },
        {
          id: "monobath-prepare-60",
          atSec: 30,
          label: "Prepare to agitate",
          style: "soft",
        },
        {
          id: "monobath-agitate-60",
          atSec: 60,
          durationSec: 10,
          label: "Agitate for 10 sec",
          style: "strong",
        },
        {
          id: "monobath-prepare-120",
          atSec: 90,
          label: "Prepare to agitate",
          style: "soft",
        },
      ],
    },
  ],
};

describe("runtime", () => {
  it("hydrates an in-progress session into recovering with uncertainty", () => {
    const runningState = createRunningState();

    const hydrated = hydrateActiveSession(
      {
        ...runningState,
        lastPersistedAtMs: 5_000,
      },
      21_000,
    );

    expect(hydrated.status).toBe("recovering");
    expect(hydrated.resumeStatus).toBe("running");
    expect(hydrated.uncertaintyMs).toBe(16_000);
    expect(hydrated.recoveryNote).toMatch(/away for a while/i);
    expect(hydrated.eventLog.at(-1)?.type).toBe("recovery_needed");
  });

  it("resumes from pause and tracks paused duration", () => {
    const runningState = createRunningState();
    const pausedState = pauseSession(runningState, 4_000);
    const resumedState = resumeSession(pausedState, 7_500);

    expect(pausedState.status).toBe("paused");
    expect(resumedState.status).toBe("running");
    expect(resumedState.totalPausedMs).toBe(3_500);
    expect(resumedState.pauseStartedAtMs).toBeNull();
    expect(resumedState.eventLog.at(-1)?.type).toBe("resumed");
  });

  it("holds at a phase boundary until the next phase is confirmed manually", () => {
    const runningState = createRunningState();
    const waitingState = waitForPhaseConfirmation(runningState, 9_000, "Stop");
    const confirmedState = confirmPhaseStart(waitingState, 13_500, "Stop");

    expect(waitingState.status).toBe("awaiting_phase_start");
    expect(waitingState.pauseStartedAtMs).toBe(9_000);
    expect(waitingState.eventLog.at(-1)?.type).toBe("phase_wait_started");
    expect(confirmedState.status).toBe("running");
    expect(confirmedState.totalPausedMs).toBe(4_500);
    expect(confirmedState.pauseStartedAtMs).toBeNull();
    expect(confirmedState.eventLog.at(-1)?.type).toBe("phase_wait_confirmed");
  });

  it("confirms recovery back into the stored resume status", () => {
    const recoveringState: ActiveSessionState = {
      ...createRunningState(),
      status: "recovering",
      resumeStatus: "paused",
      uncertaintyMs: 8_000,
      recoveryNote: "Recovered recently.",
    };

    const confirmed = confirmRecovery(recoveringState, 11_000);

    expect(confirmed.status).toBe("paused");
    expect(confirmed.uncertaintyMs).toBe(0);
    expect(confirmed.recoveryNote).toBeUndefined();
    expect(confirmed.eventLog.at(-1)?.type).toBe("recovery_confirmed");
  });

  it("derives the current phase and upcoming cue from elapsed time", () => {
    const runningState = createRunningState();

    const frame = deriveRuntimeFrame(simplePlan, runningState, 6_000);

    expect(frame.completed).toBe(false);
    expect(frame.phaseIndex).toBe(0);
    expect(frame.currentPhase?.label).toBe("Developer");
    expect(frame.elapsedInPhaseSec).toBe(5);
    expect(frame.remainingInPhaseSec).toBe(25);
    expect(frame.nextCue?.id).toBe("developer-prepare");
    expect(frame.nextCueInSec).toBe(5);
  });

  it("freezes elapsed time while paused instead of counting backward", () => {
    const runningState = createRunningState();
    const pausedState = pauseSession(runningState, 9_000);

    const frame = deriveRuntimeFrame(simplePlan, pausedState, 30_000);

    expect(frame.elapsedInPhaseSec).toBe(8);
    expect(frame.remainingInPhaseSec).toBe(22);
    expect(frame.nextCue?.id).toBe("developer-prepare");
    expect(frame.nextCueInSec).toBe(2);
  });

  it("freezes elapsed time while waiting for manual phase confirmation", () => {
    const runningState = createRunningState();
    const waitingState = waitForPhaseConfirmation(runningState, 9_000, "Stop");

    const frame = deriveRuntimeFrame(simplePlan, waitingState, 30_000);

    expect(frame.elapsedInPhaseSec).toBe(8);
    expect(frame.remainingInPhaseSec).toBe(22);
    expect(frame.nextCue?.id).toBe("developer-prepare");
    expect(frame.nextCueInSec).toBe(2);
  });

  it("freezes elapsed time after a session is stopped or completed", () => {
    const runningState = createRunningState();
    const abortedState = abortSession(runningState, 9_000);
    const completedState = completeSession(runningState, 11_000);

    const abortedFrame = deriveRuntimeFrame(simplePlan, abortedState, 30_000);
    const completedFrame = deriveRuntimeFrame(simplePlan, completedState, 40_000);

    expect(abortedFrame.elapsedInPhaseSec).toBe(8);
    expect(abortedFrame.remainingInPhaseSec).toBe(22);
    expect(completedFrame.elapsedInPhaseSec).toBe(10);
    expect(completedFrame.remainingInPhaseSec).toBe(20);
  });

  it("marks the runtime frame complete after the final phase", () => {
    const runningState = createRunningState();

    const frame = deriveRuntimeFrame(simplePlan, runningState, 60_000);

    expect(frame.completed).toBe(true);
    expect(frame.currentPhase).toBeNull();
    expect(frame.nextCue).toBeNull();
    expect(frame.phaseIndex).toBe(1);
  });

  it("holds on a manual phase once the timed phase reaches its boundary", () => {
    const runningState = startSession(
      createActiveSession(manualPlan, 1_000),
      1_000,
    );

    const frame = deriveRuntimeFrame(manualPlan, runningState, 31_000);

    expect(frame.completed).toBe(false);
    expect(frame.currentPhase?.id).toBe("wash-step");
    expect(frame.currentPhase?.timerMode).toBe("manual");
    expect(frame.remainingInPhaseSec).toBe(0);
  });

  it("keeps the initial agitation window active through the first 30 seconds", () => {
    const runningState = startSession(
      createActiveSession(cueWindowPlan, 1_000),
      1_000,
    );

    const frame = deriveRuntimeFrame(cueWindowPlan, runningState, 6_000);

    expect(frame.activeCue?.id).toBe("monobath-initial");
    expect(frame.activeCueRemainingSec).toBe(25);
    expect(frame.nextCue?.id).toBe("monobath-prepare-60");
    expect(frame.nextCueInSec).toBe(25);
  });

  it("keeps a timed agitation cue active until its full duration has elapsed", () => {
    const runningState = startSession(
      createActiveSession(cueWindowPlan, 1_000),
      1_000,
    );

    const frame = deriveRuntimeFrame(cueWindowPlan, runningState, 64_000);

    expect(frame.activeCue?.id).toBe("monobath-agitate-60");
    expect(frame.activeCueRemainingSec).toBe(7);
    expect(frame.nextCue?.id).toBe("monobath-prepare-120");
    expect(frame.nextCueInSec).toBe(27);
  });

  it("advances past a manual phase only after the user completes it", () => {
    const runningState = startSession(
      createActiveSession(manualPlan, 1_000),
      1_000,
    );
    const waitingState = waitForPhaseConfirmation(
      runningState,
      31_000,
      "Minimal wash · 5 inversions",
    );
    const completedState = completeManualPhase(
      waitingState,
      38_000,
      "wash-step",
      "Minimal wash · 5 inversions",
    );

    const frame = deriveRuntimeFrame(manualPlan, completedState, 38_000);

    expect(completedState.completedManualPhaseIds).toContain("wash-step");
    expect(frame.completed).toBe(true);
  });
});
