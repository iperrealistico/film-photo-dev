import { describe, expect, it } from 'vitest';
import { defaultAlertProfiles, recipes } from '../data/recipes';
import { createDefaultInputState, createSessionPlan } from './planner';
import { createActiveSession, deriveRuntimeFrame, hydrateActiveSession } from './runtime';

describe('session planning', () => {
  it('creates a usable plan for every bundled recipe', () => {
    for (const recipe of recipes) {
      const plan = createSessionPlan(
        recipe.id,
        createDefaultInputState(recipe),
        defaultAlertProfiles[0],
      );

      expect(plan.phaseList.length).toBeGreaterThan(0);
      expect(plan.totalDurationSec).toBeGreaterThan(0);
      expect(plan.sourceSummary.length).toBeGreaterThan(0);
    }
  });

  it('keeps HC-110 capacity checks visible', () => {
    const recipe = recipes.find((entry) => entry.id === 'kodak-hc110');

    if (!recipe) {
      throw new Error('Missing HC-110 recipe.');
    }

    const plan = createSessionPlan(
      recipe.id,
      {
        ...createDefaultInputState(recipe),
        tankVolumeMl: 250,
        dilution: '79',
        filmFormat: '8x10',
        quantity: 2
      },
      defaultAlertProfiles[0],
    );

    expect(plan.capacityCheck).toBeDefined();
    expect(plan.capacityCheck?.status).toBe('danger');
  });
});

describe('runtime recovery', () => {
  it('marks active sessions as recovering after hydration', () => {
    const recipe = recipes[0];
    const plan = createSessionPlan(
      recipe.id,
      createDefaultInputState(recipe),
      defaultAlertProfiles[0],
    );
    const active = createActiveSession(plan, 1_000);

    const hydrated = hydrateActiveSession(
      {
        ...active,
        status: 'running',
        startEpochMs: 1_000,
        lastPersistedAtMs: 2_000
      },
      20_000,
    );

    expect(hydrated.status).toBe('recovering');
    expect(hydrated.uncertaintyMs).toBeGreaterThan(0);
  });

  it('derives the current phase from absolute time', () => {
    const recipe = recipes.find((entry) => entry.id === 'cinestill-df96');

    if (!recipe) {
      throw new Error('Missing DF96 recipe.');
    }

    const plan = createSessionPlan(
      recipe.id,
      createDefaultInputState(recipe),
      defaultAlertProfiles[0],
    );
    const active = {
      ...createActiveSession(plan, 0),
      status: 'running' as const,
      startEpochMs: 0
    };
    const frame = deriveRuntimeFrame(plan, active, 90_000);

    expect(frame.currentPhase?.label).toBe('Monobath');
    expect(frame.remainingInPhaseSec).toBeGreaterThan(0);
  });
});
