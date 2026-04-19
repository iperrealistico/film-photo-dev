import { recipes } from '../data/recipes';
import type {
  AlertProfile,
  CalculationTraceEntry,
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

const HC110_REFERENCE_AREA_SQIN = 80;
const HC110_ACTIVE_AGENT_ML_PER_REFERENCE_LOAD = 6.25;

const hc110AreaByFormat: Record<string, number> = {
  '4x5': 20,
  '5x7': 35,
  '8x10': 80,
  '135-36exp': 80,
  '120': 80
};

const hc110Dilutions = [
  { label: 'A', ratio: 15 },
  { label: 'B', ratio: 31 },
  { label: 'D', ratio: 39 },
  { label: 'E', ratio: 47 },
  { label: 'H', ratio: 63 },
  { label: 'F', ratio: 79 }
];

const hc110DilutionsWeakestFirst = [...hc110Dilutions].sort(
  (left, right) => right.ratio - left.ratio,
);

const bwTemperatureCompensationFactors = [
  { tempC: 18, factor: 1.22 },
  { tempC: 19, factor: 1.11 },
  { tempC: 20, factor: 1.0 },
  { tempC: 21, factor: 0.9 },
  { tempC: 22, factor: 0.84 },
  { tempC: 24, factor: 0.69 },
  { tempC: 25, factor: 0.63 },
  { tempC: 27, factor: 0.53 }
] as const;

const cs41BaseByTemperatureF: Record<number, number> = {
  72: 3000,
  75: 2100,
  80: 1260,
  85: 780,
  90: 510,
  95: 345,
  102: 210
};

const cs41PullByTemperatureF: Record<number, number> = {
  72: 3000,
  75: 2100,
  80: 1620,
  85: 975,
  90: 600,
  95: 390,
  102: 270
};

const cs41PushMultiplierByStops: Record<number, number> = {
  1: 1.3,
  2: 1.75,
  3: 2.5
};

const cs41ReuseStepByBatchMl: Record<string, number> = {
  '500': 0.04,
  '1000': 0.02,
  '2000': 0.01
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

function formatClock(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function formatMinutes(seconds: number) {
  return `${(seconds / 60).toFixed(2)} min`;
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

function roundUpToStep(value: number, step: number) {
  return Math.ceil(value / step) * step;
}

function makeTraceEntry(
  label: string,
  value: string,
  source: string,
  detail?: string,
  emphasis: CalculationTraceEntry['emphasis'] = 'source',
): CalculationTraceEntry {
  return {
    id: makeId('trace'),
    label,
    value,
    source,
    detail,
    emphasis
  };
}

function buildAgitationCueSeries(
  phaseId: string,
  durationSec: number,
  repeatIntervalSec: number,
  leadSec: number,
  inversions: number,
  inversionIntervalSec = 2,
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
      cues.push({
        id: `${phaseId}-agitate-${windowStart}-${inversionIndex}`,
        atSec: Math.min(
          durationSec - 1,
          windowStart + inversionIndex * Math.max(1, inversionIntervalSec),
        ),
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

function interpolateBwTemperatureFactor(temperatureC: number) {
  if (temperatureC <= bwTemperatureCompensationFactors[0].tempC) {
    return bwTemperatureCompensationFactors[0].factor;
  }

  const last = bwTemperatureCompensationFactors.at(-1);

  if (last && temperatureC >= last.tempC) {
    return last.factor;
  }

  for (let index = 0; index < bwTemperatureCompensationFactors.length - 1; index += 1) {
    const current = bwTemperatureCompensationFactors[index];
    const next = bwTemperatureCompensationFactors[index + 1];

    if (temperatureC >= current.tempC && temperatureC <= next.tempC) {
      const span = next.tempC - current.tempC;
      const progress = span === 0 ? 0 : (temperatureC - current.tempC) / span;
      return current.factor + (next.factor - current.factor) * progress;
    }
  }

  return 1;
}

function adjustBwTimeForTemperature(baseTimeSec: number, temperatureC: number) {
  const factor = interpolateBwTemperatureFactor(temperatureC);
  const adjustedSec = Math.max(60, roundToStep(baseTimeSec * factor, 15));

  return {
    adjustedSec,
    factor
  };
}

function buildHc110LoadLabel(format: string, quantity: number) {
  switch (format) {
    case '4x5':
    case '5x7':
    case '8x10':
      return `${quantity} sheet${quantity === 1 ? '' : 's'} of ${format}`;
    case '120':
      return `${quantity} 120 roll${quantity === 1 ? '' : 's'}`;
    default:
      return `${quantity} 35mm roll${quantity === 1 ? '' : 's'}`;
  }
}

function getWeakestPassingHc110Dilution(
  tankVolumeMl: number,
  minimumActiveAgentMl: number,
) {
  return hc110DilutionsWeakestFirst.find(
    (dilution) => tankVolumeMl / (1 + dilution.ratio) >= minimumActiveAgentMl,
  );
}

function describeHc110Capacity(values: RecipeInputMap, syrupMl: number): CapacityCheck {
  const format = getString(values, 'filmFormat');
  const quantity = getNumber(values, 'quantity');
  const tankVolumeMl = getNumber(values, 'tankVolumeMl');
  const dilutionRatio = getNumber(values, 'dilution');
  const areaPerUnitSqIn = hc110AreaByFormat[format] ?? HC110_REFERENCE_AREA_SQIN;
  const filmAreaSqIn = areaPerUnitSqIn * quantity;
  const minimumActiveAgentMl =
    (filmAreaSqIn / HC110_REFERENCE_AREA_SQIN) *
    HC110_ACTIVE_AGENT_ML_PER_REFERENCE_LOAD;
  const marginMl = Number((syrupMl - minimumActiveAgentMl).toFixed(1));
  const minimumVolumeAtCurrentDilutionMl = roundUpToStep(
    minimumActiveAgentMl * (1 + dilutionRatio),
    10,
  );
  const maxAreaSqInAtCurrentMix = Number(
    (
      (syrupMl / HC110_ACTIVE_AGENT_ML_PER_REFERENCE_LOAD) *
      HC110_REFERENCE_AREA_SQIN
    ).toFixed(1),
  );
  const maxUnitsAtCurrentMix = Math.max(
    0,
    Math.floor(maxAreaSqInAtCurrentMix / areaPerUnitSqIn),
  );
  const recommendedDilution =
    marginMl < 0
      ? getWeakestPassingHc110Dilution(tankVolumeMl, minimumActiveAgentMl)
      : undefined;

  const baseShape = {
    marginMl,
    filmAreaSqIn,
    loadLabel: buildHc110LoadLabel(format, quantity),
    minimumActiveAgentMl,
    actualActiveAgentMl: syrupMl,
    minimumVolumeAtCurrentDilutionMl,
    recommendedDilutionLabel: recommendedDilution?.label,
    recommendedDilutionRatio: recommendedDilution?.ratio,
    maxAreaSqInAtCurrentMix,
    maxUnitsAtCurrentMix
  } satisfies Omit<CapacityCheck, 'status' | 'message'>;

  if (marginMl < 0) {
    return {
      ...baseShape,
      status: 'danger',
      message: 'Too little HC-110 concentrate for this film load.'
    };
  }

  if (marginMl < 2) {
    return {
      ...baseShape,
      status: 'limit',
      message: 'This mix only just clears the recommended minimum.'
    };
  }

  return {
    ...baseShape,
    status: 'ok',
    message: 'This mix gives you comfortable concentrate headroom.'
  };
}

export function formatHc110CapacityWarning(capacityCheck: CapacityCheck) {
  if (capacityCheck.status === 'danger') {
    return capacityCheck.recommendedDilutionLabel
      ? `Too dilute for this load. At this volume, switch to ${capacityCheck.recommendedDilutionLabel} · 1+${capacityCheck.recommendedDilutionRatio} or mix more working solution.`
      : 'Too dilute for this load. Increase the total working solution before you start.';
  }

  if (capacityCheck.status === 'limit') {
    return 'This mix clears the minimum by less than 2 ml of syrup.';
  }

  return 'Capacity looks good for this film load.';
}

function buildCs41DeveloperGuidance(temperatureF: number) {
  if (temperatureF <= 80) {
    return {
      initialContinuousSec: 60,
      repeatIntervalSec: 120,
      detail: 'Continuous first minute, then 4 inversions every 2 minutes.'
    };
  }

  if (temperatureF <= 95) {
    return {
      initialContinuousSec: 30,
      repeatIntervalSec: 60,
      detail: 'Continuous first 30 seconds, then 4 inversions every minute.'
    };
  }

  return {
    initialContinuousSec: 10,
    repeatIntervalSec: 30,
    detail: 'Continuous first 10 seconds, then 4 inversions every 30 seconds.'
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
  const blixTimeMin = getNumber(values, 'blixTimeMin');
  const transitionDelaySec = getNumber(values, 'transitionDelaySec');
  const inversions = getNumber(values, 'inversions');
  const inversionIntervalSec = getNumber(values, 'inversionIntervalSec');
  const warningLeadSec = Math.max(
    alertProfile.warningLeadSec,
    getNumber(values, 'warningLeadSec'),
  );
  const agitationMode = getString(values, 'agitationMode');

  const baseTimeSec = cs41BaseByTemperatureF[temperatureF] ?? cs41BaseByTemperatureF[102];
  const isPull = processingMode === 'pushpull' && pushPullStops < 0;
  const isPush = processingMode === 'pushpull' && pushPullStops > 0;
  const pushPullMultiplier = isPush ? cs41PushMultiplierByStops[pushPullStops] ?? 1 : 1;
  const pullTimeSec = isPull ? cs41PullByTemperatureF[temperatureF] ?? baseTimeSec : baseTimeSec;
  const pushPullAdjustedSec = isPull
    ? pullTimeSec
    : Math.round(baseTimeSec * pushPullMultiplier);
  const reuseMultiplier =
    chemistryState === 'reused'
      ? 1 + (cs41ReuseStepByBatchMl[solutionVolume] ?? 0.02) * filmsProcessed
      : 1;
  const developerSec = Math.round(pushPullAdjustedSec * reuseMultiplier);
  const blixSec = Math.round(blixTimeMin * 60);
  const washSec = 180;
  const finalRinseSec = 45;
  const developerGuidance = buildCs41DeveloperGuidance(temperatureF);

  const developerCues =
    agitationMode === 'continuous'
      ? [
          {
            id: 'developer-continuous-check',
            atSec: Math.min(30, Math.max(1, developerSec - 1)),
            label: 'Keep agitation moving',
            style: 'soft' as const
          }
        ]
      : ([
          {
            id: 'developer-initial-window-end',
            atSec: Math.min(
              developerSec - 1,
              developerGuidance.initialContinuousSec,
            ),
            label: 'Switch to interval agitation',
            style: 'soft' as const
          }
        ] as CueEvent[]).concat(
          buildAgitationCueSeries(
            'developer',
            developerSec,
            developerGuidance.repeatIntervalSec,
            warningLeadSec,
            inversions,
            inversionIntervalSec,
          ),
        );

  const blixCues =
    agitationMode === 'continuous'
      ? []
      : buildAgitationCueSeries(
          'blix',
          blixSec,
          30,
          warningLeadSec,
          inversions,
          inversionIntervalSec,
        );

  const phaseList = [
    buildPhase(
      'presoak',
      'Pre-soak',
      'rinse',
      60,
      'One-minute pre-soak before the developer.',
      [
        {
          id: 'presoak-next',
          atSec: Math.max(1, 60 - warningLeadSec),
          label: 'Next: developer',
          style: 'soft'
        }
      ],
    ),
    buildPhase(
      'developer',
      'Developer',
      'developer',
      developerSec,
      agitationMode === 'continuous'
        ? 'Continuous agitation for the full developer time.'
        : developerGuidance.detail,
      developerCues,
    ),
    buildPhase(
      'transition',
      'Transition to blix',
      'transition',
      transitionDelaySec,
      'Drain developer, refill, and get ready for blix.',
      [
        {
          id: 'transition-ready',
          atSec: Math.max(1, transitionDelaySec - warningLeadSec),
          label: 'Next: blix',
          style: 'soft'
        }
      ],
    ),
    buildPhase(
      'blix',
      'Blix',
      'blix',
      blixSec,
      'Fixed blix time. Reuse does not change the timer.',
      blixCues,
    ),
    buildPhase(
      'transition-wash',
      'Transition to wash',
      'transition',
      transitionDelaySec,
      'Drain blix and move to the wash.',
      [
        {
          id: 'transition-wash-ready',
          atSec: Math.max(1, transitionDelaySec - warningLeadSec),
          label: 'Next: wash',
          style: 'soft'
        }
      ],
    ),
    buildPhase(
      'wash',
      'Wash',
      'wash',
      washSec,
      'Three-minute wash after blix.',
      [
        {
          id: 'wash-next',
          atSec: Math.max(1, washSec - warningLeadSec),
          label: 'Next: optional final rinse',
          style: 'soft'
        }
      ],
    ),
    buildPhase(
      'final-rinse',
      'Final rinse',
      'wetting',
      finalRinseSec,
      'Optional final rinse / stabilizer window.',
    )
  ];

  const calculationTrace: CalculationTraceEntry[] = [
    makeTraceEntry(
      'Developer base time',
      formatMinutes(baseTimeSec),
      'CineStill Cs41 powder instructions',
      `Variable-temperature chart at ${temperatureF}°F.`,
    ),
    makeTraceEntry(
      'Exposure adjustment',
      isPull ? formatMinutes(pushPullAdjustedSec) : `${pushPullMultiplier.toFixed(2)}x`,
      isPull
        ? 'CineStill Cs41 variable-temperature pull chart'
        : isPush
          ? 'CineStill Cs41 push factors'
          : 'Standard Cs41 processing',
      isPull
        ? 'Pull -1 uses the dedicated variable-temperature row from the instructions.'
        : isPush
          ? `Push ${pushPullStops > 0 ? `+${pushPullStops}` : pushPullStops} follows the official Cs41 multiplier.`
          : 'No push/pull adjustment applied.',
      isPush || isPull ? 'source' : 'manual',
    ),
    makeTraceEntry(
      'Reuse adjustment',
      `${reuseMultiplier.toFixed(2)}x`,
      'CineStill Cs41 weakened developer guidance',
      chemistryState === 'reused'
        ? `${solutionVolume} ml batch with ${filmsProcessed} prior roll-equivalents.`
        : 'Fresh developer, so no reuse increase was applied.',
      chemistryState === 'reused' ? 'source' : 'manual',
    ),
    makeTraceEntry(
      'Final developer time',
      formatMinutes(developerSec),
      'Combined Cs41 developer timing logic',
      'Developer = base time × push/pull adjustment × reuse adjustment.',
      'derived',
    ),
    makeTraceEntry(
      'Developer agitation',
      agitationMode === 'continuous' ? 'Continuous' : developerGuidance.detail,
      'CineStill Cs41 variable-temperature chart',
      `Interval cues use ${inversions} inversions with ${inversionIntervalSec} sec spacing.`,
    ),
    makeTraceEntry(
      'Blix timing',
      formatMinutes(blixSec),
      'CineStill Cs41 powder instructions',
      'Blix time stays fixed even when the chemistry is reused.',
    ),
    makeTraceEntry(
      'Post-blix steps',
      'Wash 3 min + optional final rinse 45 sec',
      'CineStill standard processing steps',
      'The app now keeps the wash and optional final rinse inside the guided timeline.',
    )
  ];

  const warnings = [
    chemistryState === 'reused'
      ? 'Reuse adjustment is active. Confirm your developer batch history before you start.'
      : 'Using fresh developer.',
    'Blix time stays fixed. CineStill says blix reuse does not change processing time.'
  ];

  if (isPush && chemistryState === 'reused') {
    warnings.push(
      'CineStill does not recommend weakened developer for push processing.',
    );
  }

  if (chemistryState === 'reused' && temperatureF < 85) {
    warnings.push(
      'CineStill notes weakened developer is less effective at lower processing temperatures.',
    );
  }

  if (isPull) {
    warnings.push(
      'Pull -1 follows the Cs41 variable-temperature chart rather than a simple percentage reduction.',
    );
  }

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
      { label: 'Developer base time', value: formatMinutes(baseTimeSec) },
      {
        label: isPull ? 'Pull -1 time' : 'Push / pull adjustment',
        value: isPull ? formatMinutes(pushPullAdjustedSec) : `${pushPullMultiplier.toFixed(2)}x`,
        emphasis: processingMode === 'pushpull' ? 'strong' : 'normal'
      },
      {
        label: 'Reuse adjustment',
        value: `${reuseMultiplier.toFixed(2)}x`,
        emphasis: chemistryState === 'reused' ? 'strong' : 'normal'
      },
      {
        label: 'Final developer time',
        value: formatMinutes(developerSec),
        emphasis: 'strong'
      },
      {
        label: 'Final blix time',
        value: formatMinutes(blixSec)
      }
    ],
    calculationTrace,
    mixAmounts: [],
    warnings,
    readinessChecklist: [
      'Bring the developer and blix up to temperature before start.',
      'Set bottles left-to-right in process order.',
      'Keep wash water ready before the blix finishes.'
    ],
    nextSteps: [
      'The guided timeline now continues through wash and the optional final rinse.',
      'If you are pushing color, double-check developer freshness before committing film.'
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

  const temperatureAdjustment = adjustBwTimeForTemperature(baseTimeSec, temperatureC);
  const developerSec = temperatureAdjustment.adjustedSec;
  const syrupMl = Number((tankVolumeMl / (1 + dilution)).toFixed(1));
  const waterMl = Number((tankVolumeMl - syrupMl).toFixed(1));
  const capacityCheck = describeHc110Capacity(values, syrupMl);
  const format = getString(values, 'filmFormat');
  const quantity = getNumber(values, 'quantity');
  const areaPerUnitSqIn = hc110AreaByFormat[format] ?? HC110_REFERENCE_AREA_SQIN;

  const developerCues =
    agitationMode === 'continuous'
      ? [
          {
            id: 'developer-check',
            atSec: Math.min(30, Math.max(1, developerSec - 1)),
            label: 'Keep agitation moving',
            style: 'soft' as const
          }
        ]
      : buildAgitationCueSeries(
          'developer',
          developerSec,
          30,
          warningLeadSec,
          inversions,
        );

  const fixCues = buildAgitationCueSeries('fix', fixerSec, 30, warningLeadSec, inversions);

  const phaseList: PhaseDefinition[] = [
    buildPhase(
      'developer',
      'Developer',
      'developer',
      developerSec,
      agitationMode === 'continuous'
        ? 'Continuous agitation selected. This build does not auto-shorten the time for rotary use.'
        : 'Small-tank reminder cadence: agitation cues every 30 seconds.',
      developerCues,
    ),
    buildPhase('drain-dev', 'Drain developer', 'drain', drainSec, 'Pour out the developer.'),
    buildPhase('fill-stop', 'Fill stop bath', 'fill', fillSec, 'Fill the tank with stop bath.'),
    buildPhase(
      'stop',
      'Stop bath',
      'stop',
      stopBathSec,
      'Short stop before fixer.',
      [
        {
          id: 'stop-ready',
          atSec: Math.max(1, stopBathSec - warningLeadSec),
          label: 'Next: fixer',
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
      'Fixer phase with 30-second agitation reminders.',
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
        'Optional hypo clear step.',
        [
          {
            id: 'hypo-next',
            atSec: Math.max(1, hypoSec - warningLeadSec),
            label: 'Next: wash',
            style: 'soft'
          }
        ],
      ),
    );
  }

  phaseList.push(
    buildPhase('fill-wash', 'Fill wash', 'fill', fillSec, 'Prepare for wash.'),
    buildPhase('wash', 'Wash', 'wash', washSec, 'Final wash before drying.'),
    buildPhase(
      'wetting',
      'Wetting agent',
      'wetting',
      60,
      'Final wetting-agent step before drying.',
    ),
  );

  const calculationTrace: CalculationTraceEntry[] = [
    makeTraceEntry(
      'Film/developer base time',
      formatClock(baseTimeSec),
      'Seeded HC-110 recipe table for this app',
      `${filmStock} at EI ${exposureIndex}. This is a curated starting point, not a full manufacturer database.`,
    ),
    makeTraceEntry(
      'Temperature compensation',
      `${temperatureAdjustment.factor.toFixed(2)}x -> ${formatClock(developerSec)}`,
      'ILFORD general time/temperature compensation chart',
      `${temperatureC}°C uses the general black-and-white compensation curve. Test before critical work.`,
      temperatureC === 20 ? 'manual' : 'derived',
    ),
    makeTraceEntry(
      'Agitation mode',
      agitationMode === 'continuous' ? 'Continuous' : 'Intermittent every 30 sec',
      agitationMode === 'continuous'
        ? 'User-selected runtime behavior'
        : 'Kodak J-24 small-tank manual agitation cadence',
      agitationMode === 'continuous'
        ? 'No automatic time reduction is applied for continuous agitation in this build.'
        : `${inversions} inversions are cued for each 30-second reminder set.`,
      agitationMode === 'continuous' ? 'warning' : 'source',
    ),
    makeTraceEntry(
      'Film load area',
      `${capacityCheck.filmAreaSqIn.toFixed(1)} in²`,
      'HC-110 capacity-equivalent area model',
      `${quantity} × ${areaPerUnitSqIn} in²-per-unit capacity equivalent for ${format}.`,
      'derived',
    ),
    makeTraceEntry(
      'Mix calculation',
      `${syrupMl.toFixed(1)} ml syrup + ${waterMl.toFixed(1)} ml water`,
      'HC-110 dilution math',
      `${tankVolumeMl} ml total at 1+${dilution}.`,
      'derived',
    ),
    makeTraceEntry(
      'Capacity threshold',
      `${capacityCheck.minimumActiveAgentMl.toFixed(1)} ml minimum`,
      'Kodak J-24 tank capacity table',
      'Kodak A/B/D tank capacities imply about 6.25 ml concentrate per 8x10-sheet equivalent load.',
    ),
    makeTraceEntry(
      'Capacity result',
      `${capacityCheck.status.toUpperCase()} (${capacityCheck.marginMl.toFixed(1)} ml margin)`,
      'Computed from film area and concentrate volume',
      capacityCheck.recommendedDilutionLabel
        ? `Suggested rescue: ${capacityCheck.recommendedDilutionLabel} · 1+${capacityCheck.recommendedDilutionRatio} or ${capacityCheck.minimumVolumeAtCurrentDilutionMl.toFixed(0)} ml total volume.`
        : capacityCheck.message,
      capacityCheck.status === 'danger' ? 'warning' : 'derived',
    )
  ];

  const warnings = [formatHc110CapacityWarning(capacityCheck)];

  if (agitationMode === 'continuous') {
    warnings.push(
      'Continuous agitation changes image characteristics, but this build does not auto-shorten the HC-110 time.',
    );
  } else {
    warnings.push('Intermittent HC-110 reminders now follow 30-second small-tank intervals.');
  }

  if (temperatureC !== 20) {
    warnings.push(
      'Temperature compensation uses a general black-and-white guide rather than film-specific HC-110 datasheet values.',
    );
  }

  if (developerSec < 300) {
    warnings.push(
      'Development times below 5 minutes can risk uneven development. Treat this as a starting point and test first.',
    );
  }

  if (dilution === 63) {
    warnings.push(
      'Dilution H is common in community use, but it is not listed in Kodak J-24. Capacity guidance here is extrapolated from the official table.',
    );
  }

  if (dilution === 79) {
    warnings.push(
      'Kodak J-24 lists dilution F as not recommended for tank use without replenishment.',
    );
  }

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
      { label: 'Base time @ 20 C', value: formatClock(baseTimeSec) },
      {
        label: 'Adjusted developer time',
        value: formatClock(developerSec),
        emphasis: 'strong'
      },
      { label: 'Film area', value: `${capacityCheck.filmAreaSqIn.toFixed(1)} in²` },
      {
        label: 'Minimum syrup needed',
        value: `${capacityCheck.minimumActiveAgentMl.toFixed(1)} ml`
      },
      { label: 'Syrup in mix', value: `${syrupMl.toFixed(1)} ml` },
      { label: 'Water in mix', value: `${waterMl.toFixed(1)} ml` }
    ],
    calculationTrace,
    mixAmounts: [
      { label: 'HC-110 syrup', amountMl: syrupMl, emphasis: true },
      { label: 'Water', amountMl: waterMl }
    ],
    warnings,
    readinessChecklist: [
      'Confirm the working solution volume and the film load.',
      'Line up stop, fixer, wash, and wetting agent before you start.',
      'Review the drain and fill steps before the timer begins.'
    ],
    nextSteps: [
      'If this setup looks right, save it as a preset for your tank.',
      'Export diagnostics if you want a copy of the calculation trace for this plan.'
    ],
    inputSnapshot: values,
    capacityCheck
  };
}

function deriveDf96Guidance(temperatureF: number) {
  if (temperatureF <= 72) {
    return {
      minimumDevelopSec: 360,
      agitationLabel: 'Minimal',
      agitationDetail: '10 sec gentle agitation, then 5 sec every minute.'
    };
  }

  if (temperatureF <= 77) {
    return {
      minimumDevelopSec: 240,
      agitationLabel: 'Intermittent',
      agitationDetail: '30 sec constant agitation, then 10 sec every minute.'
    };
  }

  return {
    minimumDevelopSec: 180,
    agitationLabel: 'Constant',
    agitationDetail: 'Continuous inversions and/or rotations while changing direction.'
  };
}

function planDf96(
  recipe: RecipeDefinition,
  values: RecipeInputMap,
  alertProfile: AlertProfile,
): SessionPlan {
  const filmName = getString(values, 'filmName');
  const temperatureF = getNumber(values, 'temperatureF');
  const requestedDevelopSec = getNumber(values, 'developSec');
  const washSec = getNumber(values, 'washSec');
  const inversions = getNumber(values, 'inversions');
  const warningLeadSec = Math.max(
    alertProfile.warningLeadSec,
    getNumber(values, 'warningLeadSec'),
  );
  const guidance = deriveDf96Guidance(temperatureF);
  const developSec = Math.max(requestedDevelopSec, guidance.minimumDevelopSec);

  const monobathCues =
    guidance.agitationLabel === 'Constant'
      ? [
          {
            id: 'monobath-keep-moving',
            atSec: Math.min(30, Math.max(1, developSec - 1)),
            label: 'Keep agitation moving',
            style: 'soft' as const
          }
        ]
      : buildAgitationCueSeries('monobath', developSec, 60, warningLeadSec, inversions);

  const phaseList = [
    buildPhase(
      'monobath',
      'Monobath',
      'developer',
      developSec,
      `${guidance.agitationLabel} agitation guidance: ${guidance.agitationDetail}`,
      monobathCues,
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

  const calculationTrace: CalculationTraceEntry[] = [
    makeTraceEntry(
      'Film choice',
      filmName,
      'Selected by the user',
      'The current Df96 planner records the film stock but uses a generic CineStill minimum-time model.',
      'manual',
    ),
    makeTraceEntry(
      'Temperature guidance',
      `${temperatureF}°F -> ${guidance.agitationLabel.toLowerCase()} zone`,
      'CineStill Df96 instructions',
      `${guidance.agitationDetail} Minimum ${formatMinutes(guidance.minimumDevelopSec)}.`,
    ),
    makeTraceEntry(
      'User-requested monobath time',
      formatMinutes(requestedDevelopSec),
      'Manual user input',
      'Used as a floor only when it is longer than the source-backed minimum.',
      'manual',
    ),
    makeTraceEntry(
      'Final monobath time',
      formatMinutes(developSec),
      'Df96 minimum-time guardrail',
      requestedDevelopSec < guidance.minimumDevelopSec
        ? 'The app raised the timer to the minimum suggested by the CineStill temperature/agitation guidance.'
        : 'The app kept the longer user-entered time.',
      requestedDevelopSec < guidance.minimumDevelopSec ? 'warning' : 'derived',
    )
  ];

  const warnings = [
    requestedDevelopSec < guidance.minimumDevelopSec
      ? `Raised monobath time to the recommended minimum for ${temperatureF}°F.`
      : 'Using your requested monobath time because it is at or above the current minimum guidance.',
    'Df96 minimums come from the CineStill temperature/agitation guide. Longer times help fixing and dye removal, not development.'
  ];

  if (temperatureF > 82) {
    warnings.push(
      'CineStill says processing above 82°F pushes density and grain.',
    );
  }

  if (temperatureF < 68) {
    warnings.push(
      'CineStill says temperatures below 68°F render pulled density and lower contrast.',
    );
  }

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
      {
        label: 'Recommended minimum',
        value: formatMinutes(guidance.minimumDevelopSec)
      },
      {
        label: 'Final monobath time',
        value: formatMinutes(developSec),
        emphasis: 'strong'
      },
      { label: 'Wash time', value: formatMinutes(washSec) },
      { label: 'Agitation style', value: guidance.agitationLabel }
    ],
    calculationTrace,
    mixAmounts: [],
    warnings,
    readinessChecklist: [
      'Pre-mix the monobath and confirm temperature before start.',
      'Have wash water ready before the timer begins.'
    ],
    nextSteps: ['Use the chemistry log to note temperature drift, clearing, or longer finishing times.'],
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
