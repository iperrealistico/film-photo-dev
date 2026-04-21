import { describe, expect, it } from "vitest";
import { defaultAlertProfiles, recipes } from "../data/recipes";
import {
  createDefaultInputState,
  createSessionPlan,
  normalizeInputState,
} from "./planner";
import {
  createActiveSession,
  deriveRuntimeFrame,
  hydrateActiveSession,
} from "./runtime";

function getMixAmount(
  plan: ReturnType<typeof createSessionPlan>,
  label: string,
) {
  const amount = plan.mixAmounts.find((entry) => entry.label === label);

  if (!amount) {
    throw new Error(`Missing mix amount: ${label}`);
  }

  return amount.amountMl;
}

describe("session planning", () => {
  it("creates a usable plan for every bundled recipe", () => {
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

  it("keeps HC-110 capacity checks visible", () => {
    const recipe = recipes.find((entry) => entry.id === "kodak-hc110");

    if (!recipe) {
      throw new Error("Missing HC-110 recipe.");
    }

    const plan = createSessionPlan(
      recipe.id,
      {
        ...createDefaultInputState(recipe),
        tankVolumeMl: 250,
        dilution: "79",
        filmFormat: "8x10",
        quantity: 2,
      },
      defaultAlertProfiles[0],
    );

    expect(plan.capacityCheck).toBeDefined();
    expect(plan.capacityCheck?.status).toBe("danger");
  });

  it("computes HC-110 syrup and water for a known mix", () => {
    const recipe = recipes.find((entry) => entry.id === "kodak-hc110");

    if (!recipe) {
      throw new Error("Missing HC-110 recipe.");
    }

    const plan = createSessionPlan(
      recipe.id,
      {
        ...createDefaultInputState(recipe),
        tankVolumeMl: 350,
        dilution: "31",
      },
      defaultAlertProfiles[0],
    );

    expect(getMixAmount(plan, "HC-110 syrup")).toBe(10.9);
    expect(getMixAmount(plan, "Water")).toBe(339.1);
    expect(plan.capacityCheck?.actualActiveAgentMl).toBe(10.9);
  });

  it("converts HC-110 film formats into their preserved load areas", () => {
    const recipe = recipes.find((entry) => entry.id === "kodak-hc110");

    if (!recipe) {
      throw new Error("Missing HC-110 recipe.");
    }

    const cases = [
      { filmFormat: "135-36exp", expectedArea: 80 },
      { filmFormat: "120", expectedArea: 80 },
      { filmFormat: "4x5", expectedArea: 20 },
      { filmFormat: "8x10", expectedArea: 80 },
    ] as const;

    for (const testCase of cases) {
      const plan = createSessionPlan(
        recipe.id,
        {
          ...createDefaultInputState(recipe),
          filmFormat: testCase.filmFormat,
          quantity: 1,
        },
        defaultAlertProfiles[0],
      );

      expect(plan.capacityCheck?.filmAreaSqIn).toBe(testCase.expectedArea);
    }
  });

  it("marks HC-110 loads at the syrup edge as limit", () => {
    const recipe = recipes.find((entry) => entry.id === "kodak-hc110");

    if (!recipe) {
      throw new Error("Missing HC-110 recipe.");
    }

    const plan = createSessionPlan(
      recipe.id,
      {
        ...createDefaultInputState(recipe),
        tankVolumeMl: 500,
        dilution: "63",
        filmFormat: "135-36exp",
        quantity: 1,
      },
      defaultAlertProfiles[0],
    );

    expect(plan.capacityCheck?.status).toBe("limit");
    expect(plan.capacityCheck?.marginMl).toBe(1.5);
    expect(plan.capacityCheck?.maxUnitsAtCurrentMix).toBe(1);
  });

  it("suggests a stronger HC-110 dilution and more volume when the load is too large", () => {
    const recipe = recipes.find((entry) => entry.id === "kodak-hc110");

    if (!recipe) {
      throw new Error("Missing HC-110 recipe.");
    }

    const plan = createSessionPlan(
      recipe.id,
      {
        ...createDefaultInputState(recipe),
        tankVolumeMl: 350,
        dilution: "63",
        filmFormat: "4x5",
        quantity: 6,
      },
      defaultAlertProfiles[0],
    );

    expect(plan.capacityCheck?.status).toBe("danger");
    expect(plan.capacityCheck?.filmAreaSqIn).toBe(120);
    expect(plan.capacityCheck?.recommendedDilutionLabel).toBe("B");
    expect(plan.capacityCheck?.recommendedDilutionRatio).toBe(31);
    expect(plan.capacityCheck?.minimumVolumeAtCurrentDilutionMl).toBe(600);
  });

  it("records an explainable HC-110 trace for diagnostics", () => {
    const recipe = recipes.find((entry) => entry.id === "kodak-hc110");

    if (!recipe) {
      throw new Error("Missing HC-110 recipe.");
    }

    const plan = createSessionPlan(
      recipe.id,
      createDefaultInputState(recipe),
      defaultAlertProfiles[0],
    );

    expect(plan.calculationTrace.length).toBeGreaterThan(0);
    expect(
      plan.calculationTrace.some((entry) => entry.label === "Film load area"),
    ).toBe(true);
    expect(
      plan.calculationTrace.some(
        (entry) => entry.label === "Capacity threshold",
      ),
    ).toBe(true);
  });

  it("keeps HC-110 continuous agitation reminders alive through the whole developer step", () => {
    const recipe = recipes.find((entry) => entry.id === "kodak-hc110");

    if (!recipe) {
      throw new Error("Missing HC-110 recipe.");
    }

    const plan = createSessionPlan(
      recipe.id,
      {
        ...createDefaultInputState(recipe),
        agitationMode: "continuous",
      },
      defaultAlertProfiles[0],
    );

    const developerPhase = plan.phaseList.find(
      (phase) => phase.label === "Developer",
    );

    expect(developerPhase?.cueEvents[0]?.label).toBe(
      "Start continuous agitation",
    );
    expect(developerPhase?.cueEvents.at(-1)?.label).toBe(
      "Keep agitation moving",
    );
    expect(developerPhase?.cueEvents.at(-1)?.atSec).toBe(
      (developerPhase?.durationSec ?? 1) - 1,
    );
    expect(developerPhase?.cueEvents.length).toBeGreaterThan(2);
  });

  it("uses 2% per processed unit for Cs41 weakened developer while keeping blix fixed by default", () => {
    const recipe = recipes.find((entry) => entry.id === "cs41-powder");

    if (!recipe) {
      throw new Error("Missing Cs41 recipe.");
    }

    const plan = createSessionPlan(
      recipe.id,
      {
        ...createDefaultInputState(recipe),
        temperatureF: "102",
        chemistryState: "reused",
        processedUnits: 5,
      },
      defaultAlertProfiles[0],
    );

    expect(plan.phaseList[0]?.label).toBe("Pre-soak");
    expect(plan.phaseList[1]?.durationSec).toBe(231);
    expect(
      plan.phaseList.find((phase) => phase.label === "Blix")?.durationSec,
    ).toBe(480);
    expect(
      plan.phaseList.find((phase) => phase.label === "Wash")?.durationSec,
    ).toBe(180);
    expect(
      plan.warnings.some((warning) =>
        /1 unit = one 135 roll, one 120 roll, one 8x10 sheet, or four 4x5 sheets/i.test(
          warning,
        ),
      ),
    ).toBe(true);
    expect(
      plan.warnings.some((warning) =>
        /blix reuse does not change/i.test(warning),
      ),
    ).toBe(true);
  });

  it("can optionally extend Cs41 blix with the same reuse multiplier as developer", () => {
    const recipe = recipes.find((entry) => entry.id === "cs41-powder");

    if (!recipe) {
      throw new Error("Missing Cs41 recipe.");
    }

    const plan = createSessionPlan(
      recipe.id,
      {
        ...createDefaultInputState(recipe),
        temperatureF: "102",
        chemistryState: "reused",
        processedUnits: 5,
        extendBlixWithReuse: true,
      },
      defaultAlertProfiles[0],
    );

    expect(
      plan.phaseList.find((phase) => phase.label === "Developer")?.durationSec,
    ).toBe(231);
    expect(
      plan.phaseList.find((phase) => phase.label === "Blix")?.durationSec,
    ).toBe(528);
    expect(
      plan.warnings.some((warning) =>
        /optional blix extension is active/i.test(warning),
      ),
    ).toBe(true);
  });

  it("normalizes legacy Cs41 reuse counts without preserving the old batch-size multiplier", () => {
    const recipe = recipes.find((entry) => entry.id === "cs41-powder");

    if (!recipe) {
      throw new Error("Missing Cs41 recipe.");
    }

    const plan = createSessionPlan(
      recipe.id,
      normalizeInputState(recipe, {
        temperatureF: "102",
        chemistryState: "reused",
        solutionVolume: "500",
        filmsProcessed: 3,
      }),
      defaultAlertProfiles[0],
    );

    expect(
      plan.phaseList.find((phase) => phase.label === "Developer")?.durationSec,
    ).toBe(223);
    expect(
      plan.phaseList.find((phase) => phase.label === "Blix")?.durationSec,
    ).toBe(480);
  });

  it("keeps Cs41 continuous agitation reminders alive through the whole developer step", () => {
    const recipe = recipes.find((entry) => entry.id === "cs41-powder");

    if (!recipe) {
      throw new Error("Missing Cs41 recipe.");
    }

    const plan = createSessionPlan(
      recipe.id,
      {
        ...createDefaultInputState(recipe),
        agitationMode: "continuous",
      },
      defaultAlertProfiles[0],
    );

    const developerPhase = plan.phaseList.find(
      (phase) => phase.label === "Developer",
    );

    expect(developerPhase?.cueEvents[0]?.label).toBe(
      "Start continuous agitation",
    );
    expect(developerPhase?.cueEvents.at(-1)?.label).toBe(
      "Keep agitation moving",
    );
    expect(developerPhase?.cueEvents.at(-1)?.atSec).toBe(
      (developerPhase?.durationSec ?? 1) - 1,
    );
    expect(developerPhase?.cueEvents.length).toBeGreaterThan(2);
  });

  it("derives the DF96 minimum from the official matrix for a supported combo", () => {
    const recipe = recipes.find((entry) => entry.id === "cinestill-df96");

    if (!recipe) {
      throw new Error("Missing DF96 recipe.");
    }

    const plan = createSessionPlan(
      recipe.id,
      {
        ...createDefaultInputState(recipe),
        agitationMode: "minimal",
        temperatureF: 70,
        extraProcessSec: 0,
      },
      defaultAlertProfiles[0],
    );

    expect(plan.phaseList[0]?.durationSec).toBe(360);
    expect(plan.phaseList[1]?.label).toBe("Drain monobath");
    expect(plan.phaseList[1]?.durationSec).toBe(10);
    expect(plan.blockingIssues).toHaveLength(0);
    expect(
      plan.calculationLines.some((line) => line.label === "Matrix result"),
    ).toBe(true);
  });

  it("models DF96 intermittent agitation as timed cue windows", () => {
    const recipe = recipes.find((entry) => entry.id === "cinestill-df96");

    if (!recipe) {
      throw new Error("Missing DF96 recipe.");
    }

    const plan = createSessionPlan(
      recipe.id,
      {
        ...createDefaultInputState(recipe),
        agitationMode: "intermittent",
        temperatureF: 75,
      },
      defaultAlertProfiles[0],
    );

    const monobathPhase = plan.phaseList[0];

    expect(monobathPhase?.cueEvents[0]).toMatchObject({
      label: "Agitate continuously for 30 sec",
      atSec: 0,
      durationSec: 30,
    });
    expect(
      monobathPhase?.cueEvents.find(
        (cue) => cue.label === "Agitate for 10 sec",
      ),
    ).toMatchObject({
      atSec: 60,
      durationSec: 10,
    });
  });

  it("caps DF96 reuse at eight minutes before applying extra time above minimum", () => {
    const recipe = recipes.find((entry) => entry.id === "cinestill-df96");

    if (!recipe) {
      throw new Error("Missing DF96 recipe.");
    }

    const plan = createSessionPlan(
      recipe.id,
      {
        ...createDefaultInputState(recipe),
        filmStock: "delta_100",
        ratingChoice: "pull",
        agitationMode: "constant",
        temperatureF: 70,
        chemistryState: "reused",
        processedUnits: 4,
        extraProcessSec: 30,
      },
      defaultAlertProfiles[0],
    );

    expect(plan.phaseList[0]?.durationSec).toBe(510);
    expect(
      plan.warnings.some(
        (warning) => /cap/i.test(warning) || /8:00/i.test(warning),
      ),
    ).toBe(true);
  });

  it("blocks unsupported DF96 matrix cells", () => {
    const recipe = recipes.find((entry) => entry.id === "cinestill-df96");

    if (!recipe) {
      throw new Error("Missing DF96 recipe.");
    }

    const plan = createSessionPlan(
      recipe.id,
      {
        ...createDefaultInputState(recipe),
        agitationMode: "constant",
        temperatureF: 65,
      },
      defaultAlertProfiles[0],
    );

    expect(plan.blockingIssues).not.toHaveLength(0);
    expect(plan.blockingIssues[0]).toMatch(/not charted/i);
  });

  it("builds manual DF96 wash steps for the minimal-water archival wash", () => {
    const recipe = recipes.find((entry) => entry.id === "cinestill-df96");

    if (!recipe) {
      throw new Error("Missing DF96 recipe.");
    }

    const plan = createSessionPlan(
      recipe.id,
      {
        ...createDefaultInputState(recipe),
        washMode: "minimal",
      },
      defaultAlertProfiles[0],
    );

    expect(plan.phaseList[1]?.label).toBe("Drain monobath");
    expect(plan.phaseList[1]?.timerMode).toBe("countdown");
    expect(
      plan.phaseList.slice(2).every((phase) => phase.timerMode === "manual"),
    ).toBe(true);
    expect(plan.phaseList.slice(2).map((phase) => phase.label)).toEqual([
      "Minimal wash · 5 inversions",
      "Minimal wash · 10 inversions",
      "Minimal wash · 20 inversions",
      "Final rinse",
    ]);
  });

  it("uses the configured DF96 drain handoff before the wash sequence", () => {
    const recipe = recipes.find((entry) => entry.id === "cinestill-df96");

    if (!recipe) {
      throw new Error("Missing DF96 recipe.");
    }

    const plan = createSessionPlan(
      recipe.id,
      {
        ...createDefaultInputState(recipe),
        drainSec: 20,
      },
      defaultAlertProfiles[0],
    );

    expect(plan.phaseList[1]?.label).toBe("Drain monobath");
    expect(plan.phaseList[1]?.durationSec).toBe(20);
    expect(
      plan.calculationLines.find((line) => line.label === "Drain before wash")
        ?.value,
    ).toBe("0:20");
  });

  it("normalizes legacy DF96 presets into the official matrix-backed fields", () => {
    const recipe = recipes.find((entry) => entry.id === "cinestill-df96");

    if (!recipe) {
      throw new Error("Missing DF96 recipe.");
    }

    const normalized = normalizeInputState(recipe, {
      filmName: "Tri-X 400",
      temperatureF: 72,
      developSec: 420,
      washSec: 300,
    });

    expect(normalized.filmStock).toBe("tri_x");
    expect(normalized.agitationMode).toBe("minimal");
    expect(normalized.temperatureF).toBe("70");
    expect(normalized.drainSec).toBe(10);
    expect(normalized.extraProcessSec).toBe(60);
  });
});

describe("runtime recovery", () => {
  it("marks active sessions as recovering after hydration", () => {
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
        status: "running",
        startEpochMs: 1_000,
        lastPersistedAtMs: 2_000,
      },
      20_000,
    );

    expect(hydrated.status).toBe("recovering");
    expect(hydrated.uncertaintyMs).toBeGreaterThan(0);
  });

  it("derives the current phase from absolute time", () => {
    const recipe = recipes.find((entry) => entry.id === "cinestill-df96");

    if (!recipe) {
      throw new Error("Missing DF96 recipe.");
    }

    const plan = createSessionPlan(
      recipe.id,
      createDefaultInputState(recipe),
      defaultAlertProfiles[0],
    );
    const active = {
      ...createActiveSession(plan, 1_000),
      status: "running" as const,
      startEpochMs: 1_000,
    };
    const frame = deriveRuntimeFrame(plan, active, 92_000);

    expect(frame.currentPhase?.label).toBe("Monobath");
    expect(frame.remainingInPhaseSec).toBeGreaterThan(0);
    expect(frame.nextCue?.label).toBe("Keep agitation moving");
    expect(frame.nextCueInSec).toBeGreaterThan(0);
  });
});
