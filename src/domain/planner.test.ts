import { describe, expect, it } from 'vitest';
import { defaultAlertProfiles, recipes } from '../data/recipes';
import { createDefaultInputState, createSessionPlan } from './planner';
import { createActiveSession, deriveRuntimeFrame, hydrateActiveSession } from './runtime';

function getMixAmount(plan: ReturnType<typeof createSessionPlan>, label: string) {
  const amount = plan.mixAmounts.find((entry) => entry.label === label);

  if (!amount) {
    throw new Error(`Missing mix amount: ${label}`);
  }

  return amount.amountMl;
}

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

  it('computes HC-110 syrup and water for a known mix', () => {
    const recipe = recipes.find((entry) => entry.id === 'kodak-hc110');

    if (!recipe) {
      throw new Error('Missing HC-110 recipe.');
    }

    const plan = createSessionPlan(
      recipe.id,
      {
        ...createDefaultInputState(recipe),
        tankVolumeMl: 350,
        dilution: '31'
      },
      defaultAlertProfiles[0],
    );

    expect(getMixAmount(plan, 'HC-110 syrup')).toBe(10.9);
    expect(getMixAmount(plan, 'Water')).toBe(339.1);
    expect(plan.capacityCheck?.actualActiveAgentMl).toBe(10.9);
  });

  it('converts HC-110 film formats into their preserved load areas', () => {
    const recipe = recipes.find((entry) => entry.id === 'kodak-hc110');

    if (!recipe) {
      throw new Error('Missing HC-110 recipe.');
    }

    const cases = [
      { filmFormat: '135-36exp', expectedArea: 80 },
      { filmFormat: '120', expectedArea: 80 },
      { filmFormat: '4x5', expectedArea: 20 },
      { filmFormat: '8x10', expectedArea: 80 }
    ] as const;

    for (const testCase of cases) {
      const plan = createSessionPlan(
        recipe.id,
        {
          ...createDefaultInputState(recipe),
          filmFormat: testCase.filmFormat,
          quantity: 1
        },
        defaultAlertProfiles[0],
      );

      expect(plan.capacityCheck?.filmAreaSqIn).toBe(testCase.expectedArea);
    }
  });

  it('marks HC-110 loads at the syrup edge as limit', () => {
    const recipe = recipes.find((entry) => entry.id === 'kodak-hc110');

    if (!recipe) {
      throw new Error('Missing HC-110 recipe.');
    }

    const plan = createSessionPlan(
      recipe.id,
      {
        ...createDefaultInputState(recipe),
        tankVolumeMl: 500,
        dilution: '63',
        filmFormat: '135-36exp',
        quantity: 1
      },
      defaultAlertProfiles[0],
    );

    expect(plan.capacityCheck?.status).toBe('limit');
    expect(plan.capacityCheck?.marginMl).toBe(1.5);
    expect(plan.capacityCheck?.maxUnitsAtCurrentMix).toBe(1);
  });

  it('suggests a stronger HC-110 dilution and more volume when the load is too large', () => {
    const recipe = recipes.find((entry) => entry.id === 'kodak-hc110');

    if (!recipe) {
      throw new Error('Missing HC-110 recipe.');
    }

    const plan = createSessionPlan(
      recipe.id,
      {
        ...createDefaultInputState(recipe),
        tankVolumeMl: 350,
        dilution: '63',
        filmFormat: '4x5',
        quantity: 6
      },
      defaultAlertProfiles[0],
    );

    expect(plan.capacityCheck?.status).toBe('danger');
    expect(plan.capacityCheck?.filmAreaSqIn).toBe(120);
    expect(plan.capacityCheck?.recommendedDilutionLabel).toBe('B');
    expect(plan.capacityCheck?.recommendedDilutionRatio).toBe(31);
    expect(plan.capacityCheck?.minimumVolumeAtCurrentDilutionMl).toBe(600);
  });

  it('records an explainable HC-110 trace for diagnostics', () => {
    const recipe = recipes.find((entry) => entry.id === 'kodak-hc110');

    if (!recipe) {
      throw new Error('Missing HC-110 recipe.');
    }

    const plan = createSessionPlan(
      recipe.id,
      createDefaultInputState(recipe),
      defaultAlertProfiles[0],
    );

    expect(plan.calculationTrace.length).toBeGreaterThan(0);
    expect(
      plan.calculationTrace.some((entry) => entry.label === 'Film load area'),
    ).toBe(true);
    expect(
      plan.calculationTrace.some((entry) => entry.label === 'Capacity threshold'),
    ).toBe(true);
  });

  it('uses official Cs41 push and reuse rules while keeping blix fixed', () => {
    const recipe = recipes.find((entry) => entry.id === 'cs41-powder');

    if (!recipe) {
      throw new Error('Missing Cs41 recipe.');
    }

    const plan = createSessionPlan(
      recipe.id,
      {
        ...createDefaultInputState(recipe),
        temperatureF: '102',
        processingMode: 'pushpull',
        pushPullStops: '2',
        chemistryState: 'reused',
        solutionVolume: '1000',
        filmsProcessed: 3
      },
      defaultAlertProfiles[0],
    );

    expect(plan.phaseList[0]?.label).toBe('Pre-soak');
    expect(plan.phaseList[1]?.durationSec).toBe(390);
    expect(plan.phaseList.find((phase) => phase.label === 'Blix')?.durationSec).toBe(480);
    expect(plan.phaseList.find((phase) => phase.label === 'Wash')?.durationSec).toBe(180);
    expect(
      plan.warnings.some((warning) => /blix reuse does not change/i.test(warning)),
    ).toBe(true);
  });

  it('raises DF96 monobath time to the minimum for the chosen temperature', () => {
    const recipe = recipes.find((entry) => entry.id === 'cinestill-df96');

    if (!recipe) {
      throw new Error('Missing DF96 recipe.');
    }

    const plan = createSessionPlan(
      recipe.id,
      {
        ...createDefaultInputState(recipe),
        temperatureF: 70,
        developSec: 180
      },
      defaultAlertProfiles[0],
    );

    expect(plan.phaseList[0]?.durationSec).toBe(360);
    expect(
      plan.warnings.some((warning) => /raised monobath time/i.test(warning)),
    ).toBe(true);
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
