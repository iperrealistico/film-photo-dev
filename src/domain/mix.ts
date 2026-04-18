import type {
  MeasurementUnit,
  MixCalculatorMode,
  MixMultiPartState,
  MixPartInput,
  MixRatioState,
  MixScaleKitState,
  MixUseWhatIHaveState,
  MixWorkspaceState,
  VolumeInput
} from './types';

const unitToMl = {
  ml: 1,
  cc: 1,
  cl: 10,
  l: 1000
} satisfies Record<MeasurementUnit, number>;

export const measurementUnitOptions: Array<{
  value: MeasurementUnit;
  label: string;
}> = [
  { value: 'ml', label: 'ml' },
  { value: 'cc', label: 'cc' },
  { value: 'cl', label: 'cl' },
  { value: 'l', label: 'L' }
];

export const commonRatioPresets: Array<{
  label: string;
  chemicalParts: number;
  waterParts: number;
}> = [
  { label: '1+4', chemicalParts: 1, waterParts: 4 },
  { label: '1+9', chemicalParts: 1, waterParts: 9 },
  { label: '1+19', chemicalParts: 1, waterParts: 19 },
  { label: '1+31', chemicalParts: 1, waterParts: 31 },
  { label: '1+63', chemicalParts: 1, waterParts: 63 }
];

export const mixModeDefinitions: Record<
  MixCalculatorMode,
  {
    label: string;
    title: string;
    description: string;
  }
> = {
  scale_kit: {
    label: 'Scale Kit',
    title: 'Scale a bottle or kit',
    description:
      'Use this when the label tells you what a full bottle makes, but you only want a smaller batch.'
  },
  dilution_ratio: {
    label: 'Ratio',
    title: 'Dilute by ratio',
    description:
      'Solve ratios such as 1+31 or 30:50 quickly when you need the numbers now.'
  },
  multi_part: {
    label: 'Multi-Part',
    title: 'Scale a multi-part kit',
    description:
      'Enter the reference recipe once, then scale Part A, B, C, and top-up water to any final amount.'
  },
  use_what_i_have: {
    label: 'On Hand',
    title: 'Use what is left',
    description:
      'Reverse the ratio from the concentrate you still have to see the biggest working batch you can make.'
  }
};

export interface ParsedRatio {
  chemicalParts: number;
  waterParts: number;
}

export interface VolumeLine {
  label: string;
  amountMl: number;
}

export interface MixCalculationResult {
  title: string;
  detail: string;
  lines: VolumeLine[];
  warnings: string[];
}

export interface ScaleKitCalculationResult extends MixCalculationResult {
  bottleUsagePercent: number;
}

export interface MultiPartCalculationResult extends MixCalculationResult {
  scaledParts: MixPartInput[];
  scaleFactor: number;
}

function sanitizeNumber(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function clampPositive(value: number) {
  return Math.max(0, sanitizeNumber(value));
}

export function toMilliliters(volume: VolumeInput) {
  return clampPositive(volume.amount) * unitToMl[volume.unit];
}

export function fromMilliliters(amountMl: number, unit: MeasurementUnit) {
  return clampPositive(amountMl) / unitToMl[unit];
}

export function formatMl(amountMl: number) {
  return `${clampPositive(amountMl).toFixed(1)} ml`;
}

export function formatVolumeInUnit(amountMl: number, unit: MeasurementUnit) {
  const value = fromMilliliters(amountMl, unit);

  switch (unit) {
    case 'l':
      return `${value.toFixed(2)} L`;
    case 'cl':
      return `${value.toFixed(1)} cl`;
    case 'cc':
      return `${value.toFixed(1)} cc`;
    default:
      return `${value.toFixed(1)} ml`;
  }
}

export function createRatioText(chemicalParts: number, waterParts: number) {
  return `${clampPositive(chemicalParts)}+${clampPositive(waterParts)}`;
}

export function parseRatioNotation(value: string): ParsedRatio | null {
  const match = value.trim().match(/^(\d+(?:[.,]\d+)?)\s*([:+/])\s*(\d+(?:[.,]\d+)?)$/);

  if (!match) {
    return null;
  }

  const chemicalParts = Number(match[1].replace(',', '.'));
  const waterParts = Number(match[3].replace(',', '.'));

  if (chemicalParts <= 0 || waterParts < 0 || !Number.isFinite(chemicalParts) || !Number.isFinite(waterParts)) {
    return null;
  }

  return {
    chemicalParts,
    waterParts
  };
}

export function createDefaultMixWorkspaceState(): MixWorkspaceState {
  return {
    activeMode: 'scale_kit',
    scaleKit: {
      bottleSize: {
        amount: 1000,
        unit: 'ml'
      },
      fullYield: {
        amount: 5,
        unit: 'l'
      },
      targetAmount: {
        amount: 500,
        unit: 'ml'
      }
    },
    dilutionRatio: {
      ratioText: '1+31',
      chemicalParts: 1,
      waterParts: 31,
      targetAmount: {
        amount: 500,
        unit: 'ml'
      }
    },
    multiPart: {
      referenceYield: {
        amount: 1000,
        unit: 'ml'
      },
      targetAmount: {
        amount: 500,
        unit: 'ml'
      },
      parts: [
        { id: 'part-a', label: 'Part A', amountMl: 25 },
        { id: 'part-b', label: 'Part B', amountMl: 25 }
      ]
    },
    useWhatIHave: {
      ratioText: '1+31',
      chemicalParts: 1,
      waterParts: 31,
      concentrateOnHand: {
        amount: 18,
        unit: 'ml'
      }
    }
  };
}

function buildRatioResult(
  chemicalParts: number,
  waterParts: number,
  targetMl: number,
  title: string,
  detail: string
): MixCalculationResult {
  const warnings: string[] = [];
  const totalParts = chemicalParts + waterParts;

  if (chemicalParts <= 0 || waterParts < 0 || totalParts <= 0 || targetMl <= 0) {
    warnings.push('Set positive ratio parts and a target amount larger than zero.');
    return {
      title,
      detail,
      lines: [],
      warnings
    };
  }

  const chemicalMl = (targetMl * chemicalParts) / totalParts;
  const waterMl = Math.max(0, targetMl - chemicalMl);

  return {
    title,
    detail,
    lines: [
      { label: 'Concentrate', amountMl: chemicalMl },
      { label: 'Water', amountMl: waterMl },
      { label: 'Final volume', amountMl: targetMl }
    ],
    warnings
  };
}

export function calculateScaleKit(state: MixScaleKitState): ScaleKitCalculationResult {
  const bottleMl = toMilliliters(state.bottleSize);
  const fullYieldMl = toMilliliters(state.fullYield);
  const targetMl = toMilliliters(state.targetAmount);
  const warnings: string[] = [];

  if (bottleMl <= 0 || fullYieldMl <= 0 || targetMl <= 0) {
    warnings.push('Set the bottle size, the full-yield volume, and your target amount above zero.');
    return {
      title: 'Scale a bottle or kit',
      detail: 'Scale the bottle instructions down to the smaller batch you want to mix.',
      lines: [],
      warnings,
      bottleUsagePercent: 0
    };
  }

  const chemicalMl = (bottleMl * targetMl) / fullYieldMl;
  const waterMl = Math.max(0, targetMl - chemicalMl);
  const bottleUsagePercent = (chemicalMl / bottleMl) * 100;

  if (chemicalMl > bottleMl) {
    warnings.push('This target needs more than one full bottle. Lower the target amount or change the source bottle size.');
  }

  if (chemicalMl >= targetMl) {
    warnings.push('This math leaves no water to add. Check whether the original instructions already describe a working solution instead of concentrate.');
  }

  return {
    title: 'Scale a bottle or kit',
    detail: 'Scale the bottle instructions down to the smaller batch you want to mix.',
    lines: [
      { label: 'Concentrate to measure', amountMl: chemicalMl },
      { label: 'Water to add', amountMl: waterMl },
      { label: 'Final volume', amountMl: targetMl }
    ],
    warnings,
    bottleUsagePercent
  };
}

export function calculateDilutionRatio(state: MixRatioState): MixCalculationResult {
  return buildRatioResult(
    clampPositive(state.chemicalParts),
    clampPositive(state.waterParts),
    toMilliliters(state.targetAmount),
    'Dilute by ratio',
    'Read the ratio as concentrate plus water, then solve it to the final batch size you want.'
  );
}

export function calculateMultiPart(state: MixMultiPartState): MultiPartCalculationResult {
  const referenceYieldMl = toMilliliters(state.referenceYield);
  const targetMl = toMilliliters(state.targetAmount);
  const warnings: string[] = [];

  if (referenceYieldMl <= 0 || targetMl <= 0) {
    warnings.push('Set both the reference yield and the target amount above zero.');
    return {
      title: 'Scale a multi-part kit',
      detail: 'Scale each chemistry part from a reference recipe, then top up with water to the final amount.',
      scaledParts: [],
      scaleFactor: 0,
      lines: [],
      warnings
    };
  }

  const scaleFactor = targetMl / referenceYieldMl;
  const scaledParts = state.parts.map((part) => ({
    ...part,
    amountMl: clampPositive(part.amountMl) * scaleFactor
  }));
  const totalPartsMl = scaledParts.reduce((sum, part) => sum + part.amountMl, 0);
  const waterMl = Math.max(0, targetMl - totalPartsMl);

  if (scaledParts.some((part) => !part.label.trim())) {
    warnings.push('One or more parts do not have a label yet.');
  }

  if (totalPartsMl > targetMl) {
    warnings.push('The scaled chemistry parts already exceed the target final volume. Check the reference recipe.');
  }

  return {
    title: 'Scale a multi-part kit',
    detail: 'Scale each chemistry part from a reference recipe, then top up with water to the final amount.',
    scaledParts,
    scaleFactor,
    lines: [
      ...scaledParts.map((part) => ({
        label: part.label || 'Unlabeled part',
        amountMl: part.amountMl
      })),
      { label: 'Top-up water', amountMl: waterMl },
      { label: 'Final volume', amountMl: targetMl }
    ],
    warnings
  };
}

export function calculateUseWhatIHave(state: MixUseWhatIHaveState): MixCalculationResult {
  const chemicalParts = clampPositive(state.chemicalParts);
  const waterParts = clampPositive(state.waterParts);
  const concentrateMl = toMilliliters(state.concentrateOnHand);
  const warnings: string[] = [];

  if (chemicalParts <= 0 || waterParts < 0 || concentrateMl <= 0) {
    warnings.push('Set a valid ratio and the amount of concentrate you still have on hand.');
    return {
      title: 'Use what is left',
      detail: 'Reverse the ratio from the concentrate you have left to see the biggest batch you can still mix.',
      lines: [],
      warnings
    };
  }

  const maxWorkingMl = (concentrateMl * (chemicalParts + waterParts)) / chemicalParts;
  const waterMl = Math.max(0, maxWorkingMl - concentrateMl);

  return {
    title: 'Use what is left',
    detail: 'Reverse the ratio from the concentrate you have left to see the biggest batch you can still mix.',
    lines: [
      { label: 'Concentrate on hand', amountMl: concentrateMl },
      { label: 'Water to add', amountMl: waterMl },
      { label: 'Maximum working volume', amountMl: maxWorkingMl }
    ],
    warnings
  };
}
