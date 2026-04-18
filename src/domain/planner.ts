import { recipes } from '../data/recipes';
import type {
  AlertProfile,
  CapacityCheck,
  CueEvent,
  PhaseDefinition,
  RecipeDefinition,
  RecipeInputMap,
  SessionPlan
} from './types';

const hc110TimeTable: Record<string, Record<string, number>> = {
  'Ilford HP5+': { '400': 300, '800': 450, '1600': 660 },
  'Ilford FP4+': { '125': 480, '50': 360 },
  'Ilford Delta 100': { '100': 360, '50': 300, '200': 480 },
  'Fomapan 100': { '100': 360, '50': 270 },
  'Fomapan 200': { '200': 210, '400': 420 },
  'Fomapan 400': { '400': 420, '320': 360 }
};

const areaByFormat: Record<string, number> = {
  '4x5': 20,
  '5x7': 35,
  '8x10': 80,
  '135-36exp': 80,
  '120': 80
};

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function getNumber(values: RecipeInputMap, key: string) {
  const raw = values[key];
  return typeof raw === 'number' ? raw : Number(raw);
}

function getString(values: RecipeInputMap, key: string) {
  return String(values[key] ?? '');
}

function getBoolean(values: RecipeInputMap, key: string) {
  return Boolean(values[key]);
}

function buildAgitationCueSeries(
  phaseId: string,
  durationSec: number,
  repeatIntervalSec: number,
  leadSec: number,
  inversions: number,
) {
  const cues: CueEvent[] = [];

  for (
    let windowStart = repeatIntervalSec;
    windowStart < durationSec;
    windowStart += repeatIntervalSec
  ) {
    if (windowStart - leadSec > 0) {
      cues.push({
        id: `${phaseId}-prepare-${windowStart}`,
        atSec: windowStart - leadSec,
        label: 'Prepare to agitate',
        style: 'soft'
      });
    }

    for (let inversionIndex = 0; inversionIndex < inversions; inversionIndex += 1) {
      const spread = Math.max(2, Math.floor((inversionIndex * 10) / inversions));
      cues.push({
        id: `${phaseId}-agitate-${windowStart}-${inversionIndex}`,
        atSec: Math.min(durationSec - 1, windowStart + spread),
        label: `Invert ${inversionIndex + 1}`,
        style: inversionIndex === 0 ? 'strong' : 'soft'
      });
    }
  }

  return cues;
}

function buildPhase(
  id: string,
  label: string,
  kind: PhaseDefinition['kind'],
  durationSec: number,
  detail: string,
  cueEvents: CueEvent[] = [],
): PhaseDefinition {
  return {
    id,
    label,
    kind,
    durationSec,
    detail,
    cueEvents
  };
}

function describeCapacity(values: RecipeInputMap, syrupMl: number): CapacityCheck {
  const format = getString(values, 'filmFormat');
  const quantity = getNumber(values, 'quantity');
  const minimumActiveAgentMl = (areaByFormat[format] / 80) * 6 * quantity;
  const marginMl = syrupMl - minimumActiveAgentMl;

  if (marginMl < 0) {
    return {
      status: 'danger',
      message: 'Too dilute for the loaded film area.',
      marginMl,
      minimumActiveAgentMl,
      actualActiveAgentMl: syrupMl
    };
  }

  if (marginMl < 2) {
    return {
      status: 'limit',
      message: 'Right at the capacity edge. Treat carefully.',
      marginMl,
      minimumActiveAgentMl,
      actualActiveAgentMl: syrupMl
    };
  }

  return {
    status: 'ok',
    message: 'Capacity looks comfortable for this load.',
    marginMl,
    minimumActiveAgentMl,
    actualActiveAgentMl: syrupMl
  };
}

function planCs41(
  recipe: RecipeDefinition,
  values: RecipeInputMap,
  alertProfile: AlertProfile,
): SessionPlan {
  const temperatureF = getNumber(values, 'temperatureF');
  const processingMode = getString(values, 'processingMode');
  const pushPullStops = getNumber(values, 'pushPullStops');
  const chemistryState = getString(values, 'chemistryState');
  const solutionVolume = getString(values, 'solutionVolume');
  const filmsProcessed = getNumber(values, 'filmsProcessed');
  const blixMode = getString(values, 'blixMode');
  const blixTimeMin = getNumber(values, 'blixTimeMin');
  const transitionDelaySec = getNumber(values, 'transitionDelaySec');
  const inversions = getNumber(values, 'inversions');
  const warningLeadSec = Math.max(
    alertProfile.warningLeadSec,
    getNumber(values, 'warningLeadSec'),
  );
  const agitationMode = getString(values, 'agitationMode');

  const baseByTemperature: Record<number, number> = {
    72: 3000,
    80: 1260,
    85: 780,
    90: 510,
    95: 345,
    102: 210
  };

  const volumeReuseStep: Record<string, number> = {
    pint: 0.04,
    quart: 0.02,
    gallon: 0.005
  };

  const baseTimeSec = baseByTemperature[temperatureF] ?? 210;
  const pushPullMultiplier =
    processingMode === 'pushpull' && temperatureF >= 85
      ? 1 + pushPullStops * 0.3
      : 1;
  const reuseMultiplier =
    chemistryState === 'reused'
      ? 1 + (volumeReuseStep[solutionVolume] ?? 0.02) * filmsProcessed
      : 1;
  const developerSec = Math.round(baseTimeSec * pushPullMultiplier * reuseMultiplier);
  const blixMultiplier = blixMode === 'dynamic' ? reuseMultiplier : 1;
  const blixSec = Math.round(blixTimeMin * 60 * blixMultiplier);

  const developerInterval =
    temperatureF <= 80 ? 120 : temperatureF <= 90 ? 60 : 30;
  const developerInitialDelay =
    temperatureF <= 80 ? 60 : temperatureF <= 90 ? 30 : 10;

  const developerCues =
    agitationMode === 'continuous'
      ? [
          {
            id: 'dev-check-30',
            atSec: 30,
            label: 'Continuous agitation check',
            style: 'soft' as const
          }
        ]
      : buildAgitationCueSeries(
          'developer',
          developerSec,
          developerInterval,
          warningLeadSec,
          inversions,
        ).concat(
          buildAgitationCueSeries(
            'developer-initial',
            developerInitialDelay + 1,
            developerInitialDelay,
            warningLeadSec,
            inversions,
          ),
        );

  const blixCues =
    agitationMode === 'continuous'
      ? []
      : buildAgitationCueSeries('blix', blixSec, 30, warningLeadSec, inversions);

  const phaseList = [
    buildPhase(
      'developer',
      'Developer',
      'developer',
      developerSec,
      `${agitationMode === 'continuous' ? 'Continuous agitation.' : 'Intermittent inversion sets with advance warning.'}`,
      developerCues,
    ),
    buildPhase(
      'transition',
      'Transition to blix',
      'transition',
      transitionDelaySec,
      'Drain, fill, and prepare for the next bath.',
      [
        {
          id: 'transition-ready',
          atSec: Math.max(1, transitionDelaySec - warningLeadSec),
          label: 'Blix next',
          style: 'soft'
        }
      ],
    ),
    buildPhase(
      'blix',
      'Blix',
      'blix',
      blixSec,
      'Distinct blix phase with its own cue rhythm.',
      blixCues,
    )
  ];

  return {
    id: makeId('plan'),
    recipeId: recipe.id,
    recipeName: recipe.name,
    processType: recipe.processType,
    sourceSummary: `${recipe.source.label} · ${recipe.source.title}`,
    generatedAt: new Date().toISOString(),
    totalDurationSec: phaseList.reduce((sum, phase) => sum + phase.durationSec, 0),
    phaseList,
    calculationLines: [
      { label: 'Base developer time', value: `${(baseTimeSec / 60).toFixed(2)} min` },
      {
        label: 'Push / pull multiplier',
        value: `${pushPullMultiplier.toFixed(2)}x`,
        emphasis: processingMode === 'pushpull' ? 'strong' : 'normal'
      },
      {
        label: 'Reuse multiplier',
        value: `${reuseMultiplier.toFixed(2)}x`,
        emphasis: chemistryState === 'reused' ? 'strong' : 'normal'
      },
      {
        label: 'Final developer time',
        value: `${(developerSec / 60).toFixed(2)} min`,
        emphasis: 'strong'
      },
      {
        label: 'Final blix time',
        value: `${(blixSec / 60).toFixed(2)} min`,
        emphasis: blixMode === 'dynamic' ? 'strong' : 'normal'
      }
    ],
    mixAmounts: [],
    warnings: [
      chemistryState === 'reused'
        ? 'Reuse compensation is active. Verify your batch history before starting.'
        : 'Fresh developer selected.',
      blixMode === 'dynamic'
        ? 'Dynamic blix uses the reuse multiplier in this first build.'
        : 'Fixed blix time selected.'
    ],
    readinessChecklist: [
      'Bring the developer and blix up to temperature before start.',
      'Set bottles left-to-right in process order.',
      'Confirm the tank is sealed before the first countdown begins.'
    ],
    nextSteps: [
      'Wash and final rinse remain visible as post-session notes in this first vertical slice.',
      'Keep the phone in reach for the transition phase.'
    ],
    inputSnapshot: values
  };
}

function planHc110(
  recipe: RecipeDefinition,
  values: RecipeInputMap,
  alertProfile: AlertProfile,
): SessionPlan {
  const filmStock = getString(values, 'filmStock');
  const exposureIndex = getString(values, 'exposureIndex');
  const baseTimeSec = hc110TimeTable[filmStock]?.[exposureIndex] ?? 300;
  const temperatureC = getNumber(values, 'temperatureC');
  const agitationMode = getString(values, 'agitationMode');
  const dilution = getNumber(values, 'dilution');
  const tankVolumeMl = getNumber(values, 'tankVolumeMl');
  const stopBathSec = getNumber(values, 'stopBathSec');
  const fixerSec = getNumber(values, 'fixerSec');
  const washSec = getNumber(values, 'washSec');
  const hypoEnabled = getBoolean(values, 'hypoEnabled');
  const hypoSec = getNumber(values, 'hypoSec');
  const drainSec = getNumber(values, 'drainSec');
  const fillSec = getNumber(values, 'fillSec');
  const inversions = getNumber(values, 'inversions');
  const warningLeadSec = Math.max(
    alertProfile.warningLeadSec,
    getNumber(values, 'warningLeadSec'),
  );

  const temperatureAdjustedSec = Math.max(
    180,
    Math.round(baseTimeSec * Math.exp(-0.093 * (temperatureC - 20))),
  );
  const developerSec =
    agitationMode === 'continuous'
      ? Math.max(180, Math.round(temperatureAdjustedSec * 0.85))
      : temperatureAdjustedSec;

  const syrupMl = Number((tankVolumeMl / (1 + dilution)).toFixed(1));
  const waterMl = Number((tankVolumeMl - syrupMl).toFixed(1));
  const capacityCheck = describeCapacity(values, syrupMl);

  const developerCues =
    agitationMode === 'continuous'
      ? [
          {
            id: 'developer-check',
            atSec: 30,
            label: 'Keep agitation steady',
            style: 'soft' as const
          }
        ]
      : buildAgitationCueSeries(
          'developer',
          developerSec,
          60,
          warningLeadSec,
          inversions,
        );

  const fixCues = buildAgitationCueSeries('fix', fixerSec, 60, warningLeadSec, inversions);

  const phaseList: PhaseDefinition[] = [
    buildPhase(
      'developer',
      'Developer',
      'developer',
      developerSec,
      'Developer time with preserved next-cue guidance.',
      developerCues,
    ),
    buildPhase('drain-dev', 'Drain developer', 'drain', drainSec, 'Pour out the developer.'),
    buildPhase('fill-stop', 'Fill stop bath', 'fill', fillSec, 'Get the stop bath in cleanly.'),
    buildPhase(
      'stop',
      'Stop bath',
      'stop',
      stopBathSec,
      'Short stop stage before fix.',
      [
        {
          id: 'stop-ready',
          atSec: Math.max(1, stopBathSec - warningLeadSec),
          label: 'Fix next',
          style: 'soft'
        }
      ],
    ),
    buildPhase('drain-stop', 'Drain stop', 'drain', drainSec, 'Drain before fixer.'),
    buildPhase('fill-fix', 'Fill fixer', 'fill', fillSec, 'Fill the tank with fixer.'),
    buildPhase(
      'fix',
      'Fixer',
      'fix',
      fixerSec,
      'Fix phase with recurring agitation windows.',
      fixCues,
    )
  ];

  if (hypoEnabled) {
    phaseList.push(
      buildPhase('drain-fix', 'Drain fixer', 'drain', drainSec, 'Drain before hypo clear.'),
      buildPhase('fill-hypo', 'Fill hypo clear', 'fill', fillSec, 'Fill the tank with hypo clear.'),
      buildPhase(
        'hypo',
        'Hypo clear',
        'rinse',
        hypoSec,
        'Optional hypo clear stage.',
        [
          {
            id: 'hypo-next',
            atSec: Math.max(1, hypoSec - warningLeadSec),
            label: 'Wash next',
            style: 'soft'
          }
        ],
      ),
    );
  }

  phaseList.push(
    buildPhase('fill-wash', 'Fill wash', 'fill', fillSec, 'Prepare for wash.'),
    buildPhase('wash', 'Wash', 'wash', washSec, 'Final wash stage.'),
    buildPhase(
      'wetting',
      'Wetting agent',
      'wetting',
      60,
      'Optional final wetting-agent stage preserved in the timeline.',
    ),
  );

  return {
    id: makeId('plan'),
    recipeId: recipe.id,
    recipeName: recipe.name,
    processType: recipe.processType,
    sourceSummary: `${recipe.source.label} · ${recipe.source.title}`,
    generatedAt: new Date().toISOString(),
    totalDurationSec: phaseList.reduce((sum, phase) => sum + phase.durationSec, 0),
    phaseList,
    calculationLines: [
      { label: 'Base time @ 20 C', value: `${Math.round(baseTimeSec / 60)}:${String(baseTimeSec % 60).padStart(2, '0')}` },
      { label: 'Temp-adjusted developer', value: `${Math.round(developerSec / 60)}:${String(developerSec % 60).padStart(2, '0')}`, emphasis: 'strong' },
      { label: 'Working syrup', value: `${syrupMl.toFixed(1)} ml` },
      { label: 'Working water', value: `${waterMl.toFixed(1)} ml` }
    ],
    mixAmounts: [
      { label: 'HC-110 syrup', amountMl: syrupMl, emphasis: true },
      { label: 'Water', amountMl: waterMl }
    ],
    warnings: [
      capacityCheck.status === 'danger'
        ? 'Capacity warning: current dilution is below the recommended active-agent amount for this load.'
        : 'Capacity check is visible before start so you can adjust chemistry if needed.',
      agitationMode === 'continuous'
        ? 'Continuous agitation shortens developer time in this recipe model.'
        : 'Intermittent agitation uses one-minute windows with prepare cues.'
    ],
    readinessChecklist: [
      'Confirm your tank volume and loaded film quantity.',
      'Line up stop, fix, and wash before you start.',
      'Review the timeline so drain and fill transitions do not surprise you.'
    ],
    nextSteps: [
      'Use the persistent timeline preview to sanity-check the whole session.',
      'Save the preset once the setup feels right for your tank.'
    ],
    inputSnapshot: values,
    capacityCheck
  };
}

function planDf96(
  recipe: RecipeDefinition,
  values: RecipeInputMap,
  alertProfile: AlertProfile,
): SessionPlan {
  const developSec = getNumber(values, 'developSec');
  const washSec = getNumber(values, 'washSec');
  const inversions = getNumber(values, 'inversions');
  const warningLeadSec = Math.max(
    alertProfile.warningLeadSec,
    getNumber(values, 'warningLeadSec'),
  );

  const phaseList = [
    buildPhase(
      'monobath',
      'Monobath',
      'developer',
      developSec,
      'Simpler single-solution development with recurring agitation guidance.',
      buildAgitationCueSeries('monobath', developSec, 60, warningLeadSec, inversions),
    ),
    buildPhase(
      'wash',
      'Wash',
      'wash',
      washSec,
      'Rinse thoroughly before drying.',
      [
        {
          id: 'wash-finish',
          atSec: Math.max(1, washSec - warningLeadSec),
          label: 'Finish and hang to dry',
          style: 'soft'
        }
      ],
    )
  ];

  return {
    id: makeId('plan'),
    recipeId: recipe.id,
    recipeName: recipe.name,
    processType: recipe.processType,
    sourceSummary: `${recipe.source.label} · ${recipe.source.title}`,
    generatedAt: new Date().toISOString(),
    totalDurationSec: phaseList.reduce((sum, phase) => sum + phase.durationSec, 0),
    phaseList,
    calculationLines: [
      { label: 'Monobath time', value: `${(developSec / 60).toFixed(2)} min`, emphasis: 'strong' },
      { label: 'Wash time', value: `${(washSec / 60).toFixed(2)} min` },
      { label: 'Prepare cue lead', value: `${warningLeadSec} sec` }
    ],
    mixAmounts: [],
    warnings: [
      'Df96 is modeled as a simpler family to keep the shared engine honest.',
      'Even simple workflows still benefit from timeline preview and persistent completion notes.'
    ],
    readinessChecklist: [
      'Pre-mix the monobath and confirm temperature before start.',
      'Have wash water ready before the timer begins.'
    ],
    nextSteps: ['Use completion notes to log any agitation deviations or temperature drift.'],
    inputSnapshot: values
  };
}

export function createDefaultInputState(recipe: RecipeDefinition) {
  return Object.fromEntries(
    recipe.inputs.map((input) => [input.id, input.defaultValue]),
  ) satisfies RecipeInputMap;
}

export function createSessionPlan(
  recipeId: string,
  values: RecipeInputMap,
  alertProfile: AlertProfile,
) {
  const recipe = recipes.find((entry) => entry.id === recipeId);

  if (!recipe) {
    throw new Error(`Unknown recipe: ${recipeId}`);
  }

  switch (recipe.plannerId) {
    case 'cs41':
      return planCs41(recipe, values, alertProfile);
    case 'hc110':
      return planHc110(recipe, values, alertProfile);
    case 'df96':
      return planDf96(recipe, values, alertProfile);
    default:
      throw new Error(`Unknown planner: ${recipe.plannerId}`);
  }
}
