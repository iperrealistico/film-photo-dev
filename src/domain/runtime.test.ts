import { describe, expect, it } from 'vitest';
import type { ActiveSessionState, SessionPlan } from './types';
import {
  confirmRecovery,
  createActiveSession,
  deriveRuntimeFrame,
  hydrateActiveSession,
  pauseSession,
  resumeSession,
  startSession
} from './runtime';

const simplePlan: SessionPlan = {
  id: 'plan-test',
  recipeId: 'recipe-test',
  recipeName: 'Test Recipe',
  processType: 'bw',
  sourceSummary: 'Test source',
  generatedAt: '2026-04-18T09:00:00.000Z',
  totalDurationSec: 45,
  phaseList: [
    {
      id: 'developer',
      label: 'Developer',
      kind: 'developer',
      durationSec: 30,
      detail: 'Develop.',
      cueEvents: [
        {
          id: 'developer-prepare',
          atSec: 10,
          label: 'Prepare to agitate',
          style: 'soft'
        }
      ]
    },
    {
      id: 'stop',
      label: 'Stop',
      kind: 'stop',
      durationSec: 15,
      detail: 'Stop bath.',
      cueEvents: []
    }
  ],
  calculationLines: [],
  mixAmounts: [],
  warnings: [],
  readinessChecklist: [],
  nextSteps: [],
  inputSnapshot: {}
};

function createRunningState() {
  return startSession(createActiveSession(simplePlan, 1_000), 1_000);
}

describe('runtime', () => {
  it('hydrates an in-progress session into recovering with uncertainty', () => {
    const runningState = createRunningState();

    const hydrated = hydrateActiveSession(
      {
        ...runningState,
        lastPersistedAtMs: 5_000
      },
      21_000,
    );

    expect(hydrated.status).toBe('recovering');
    expect(hydrated.resumeStatus).toBe('running');
    expect(hydrated.uncertaintyMs).toBe(16_000);
    expect(hydrated.recoveryNote).toMatch(/away for a while/i);
    expect(hydrated.eventLog.at(-1)?.type).toBe('recovery_needed');
  });

  it('resumes from pause and tracks paused duration', () => {
    const runningState = createRunningState();
    const pausedState = pauseSession(runningState, 4_000);
    const resumedState = resumeSession(pausedState, 7_500);

    expect(pausedState.status).toBe('paused');
    expect(resumedState.status).toBe('running');
    expect(resumedState.totalPausedMs).toBe(3_500);
    expect(resumedState.pauseStartedAtMs).toBeNull();
    expect(resumedState.eventLog.at(-1)?.type).toBe('resumed');
  });

  it('confirms recovery back into the stored resume status', () => {
    const recoveringState: ActiveSessionState = {
      ...createRunningState(),
      status: 'recovering',
      resumeStatus: 'paused',
      uncertaintyMs: 8_000,
      recoveryNote: 'Recovered recently.'
    };

    const confirmed = confirmRecovery(recoveringState, 11_000);

    expect(confirmed.status).toBe('paused');
    expect(confirmed.uncertaintyMs).toBe(0);
    expect(confirmed.recoveryNote).toBeUndefined();
    expect(confirmed.eventLog.at(-1)?.type).toBe('recovery_confirmed');
  });

  it('derives the current phase and upcoming cue from elapsed time', () => {
    const runningState = createRunningState();

    const frame = deriveRuntimeFrame(simplePlan, runningState, 6_000);

    expect(frame.completed).toBe(false);
    expect(frame.phaseIndex).toBe(0);
    expect(frame.currentPhase?.label).toBe('Developer');
    expect(frame.elapsedInPhaseSec).toBe(5);
    expect(frame.remainingInPhaseSec).toBe(25);
    expect(frame.nextCue?.id).toBe('developer-prepare');
    expect(frame.nextCueInSec).toBe(5);
  });

  it('freezes elapsed time while paused instead of counting backward', () => {
    const runningState = createRunningState();
    const pausedState = pauseSession(runningState, 9_000);

    const frame = deriveRuntimeFrame(simplePlan, pausedState, 30_000);

    expect(frame.elapsedInPhaseSec).toBe(8);
    expect(frame.remainingInPhaseSec).toBe(22);
    expect(frame.nextCue?.id).toBe('developer-prepare');
    expect(frame.nextCueInSec).toBe(2);
  });

  it('marks the runtime frame complete after the final phase', () => {
    const runningState = createRunningState();

    const frame = deriveRuntimeFrame(simplePlan, runningState, 60_000);

    expect(frame.completed).toBe(true);
    expect(frame.currentPhase).toBeNull();
    expect(frame.nextCue).toBeNull();
    expect(frame.phaseIndex).toBe(1);
  });
});
