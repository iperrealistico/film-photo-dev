export type ProcessType = 'bw' | 'color';
export type RecipeFamily = 'bw_concentrate' | 'color_kit' | 'monobath';
export type SourceKind =
  | 'official'
  | 'manufacturer'
  | 'curated'
  | 'community'
  | 'custom';
export type ThemeMode = 'standard' | 'red_safe' | 'ultrared';
export type MeasurementUnit = 'ml' | 'cc' | 'cl' | 'l';
export type InputType = 'select' | 'number' | 'toggle';
export type FieldSection = 'film' | 'chemistry' | 'workflow' | 'runtime';
export type PhaseKind =
  | 'developer'
  | 'stop'
  | 'blix'
  | 'fix'
  | 'wash'
  | 'rinse'
  | 'drain'
  | 'fill'
  | 'transition'
  | 'wetting'
  | 'reversal'
  | 'instruction';
export type CapacityStatus = 'ok' | 'limit' | 'danger';
export type SessionStatus =
  | 'ready'
  | 'running'
  | 'paused'
  | 'recovering'
  | 'completed'
  | 'aborted';
export type MixCalculatorMode =
  | 'scale_kit'
  | 'dilution_ratio'
  | 'multi_part'
  | 'use_what_i_have';
export type DebugLogLevel = 'info' | 'warn' | 'error';
export type DebugLogCategory =
  | 'app'
  | 'ui'
  | 'planner'
  | 'runtime'
  | 'storage'
  | 'lifecycle'
  | 'pwa'
  | 'diagnostics'
  | 'error';

export type RecipeInputValue = string | number | boolean;
export type RecipeInputMap = Record<string, RecipeInputValue>;

export interface VolumeInput {
  amount: number;
  unit: MeasurementUnit;
}

export interface MixScaleKitState {
  bottleSize: VolumeInput;
  fullYield: VolumeInput;
  targetAmount: VolumeInput;
}

export interface MixRatioState {
  ratioText: string;
  chemicalParts: number;
  waterParts: number;
  targetAmount: VolumeInput;
}

export interface MixPartInput {
  id: string;
  label: string;
  amountMl: number;
}

export interface MixMultiPartState {
  referenceYield: VolumeInput;
  targetAmount: VolumeInput;
  parts: MixPartInput[];
}

export interface MixUseWhatIHaveState {
  ratioText: string;
  chemicalParts: number;
  waterParts: number;
  concentrateOnHand: VolumeInput;
}

export interface MixWorkspaceState {
  activeMode: MixCalculatorMode;
  scaleKit: MixScaleKitState;
  dilutionRatio: MixRatioState;
  multiPart: MixMultiPartState;
  useWhatIHave: MixUseWhatIHaveState;
}

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface RecipeSource {
  id: string;
  title: string;
  label: string;
  kind: SourceKind;
  url?: string;
  accessedAt: string;
  notes?: string;
}

export interface InputDefinition {
  id: string;
  label: string;
  type: InputType;
  section: FieldSection;
  unit?: string;
  helperText?: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue: RecipeInputValue;
  options?: SelectOption[];
  getOptions?: (values: RecipeInputMap) => SelectOption[];
  isVisible?: (values: RecipeInputMap) => boolean;
}

export interface RecipeDefinition {
  id: string;
  name: string;
  developerLabel: string;
  subtitle: string;
  description: string;
  processType: ProcessType;
  family: RecipeFamily;
  source: RecipeSource;
  accentTone: 'amber' | 'ember' | 'red';
  notes: string[];
  inputs: InputDefinition[];
  plannerId: 'cs41' | 'hc110' | 'df96';
}

export interface CueEvent {
  id: string;
  atSec: number;
  label: string;
  style: 'soft' | 'strong';
}

export interface PhaseDefinition {
  id: string;
  label: string;
  kind: PhaseKind;
  durationSec: number;
  detail: string;
  cueEvents: CueEvent[];
}

export interface CalculationLine {
  label: string;
  value: string;
  emphasis?: 'normal' | 'strong' | 'warn';
}

export interface MixAmount {
  label: string;
  amountMl: number;
  emphasis?: boolean;
}

export interface CalculationTraceEntry {
  id: string;
  label: string;
  value: string;
  source: string;
  detail?: string;
  emphasis?: 'source' | 'derived' | 'manual' | 'warning';
}

export interface CapacityCheck {
  status: CapacityStatus;
  message: string;
  marginMl: number;
  filmAreaSqIn: number;
  loadLabel: string;
  minimumActiveAgentMl: number;
  actualActiveAgentMl: number;
  minimumVolumeAtCurrentDilutionMl: number;
  recommendedDilutionLabel?: string;
  recommendedDilutionRatio?: number;
  maxAreaSqInAtCurrentMix: number;
  maxUnitsAtCurrentMix: number;
}

export interface SessionPlan {
  id: string;
  recipeId: string;
  recipeName: string;
  processType: ProcessType;
  sourceSummary: string;
  generatedAt: string;
  totalDurationSec: number;
  phaseList: PhaseDefinition[];
  calculationLines: CalculationLine[];
  calculationTrace: CalculationTraceEntry[];
  mixAmounts: MixAmount[];
  warnings: string[];
  readinessChecklist: string[];
  nextSteps: string[];
  inputSnapshot: RecipeInputMap;
  capacityCheck?: CapacityCheck;
}

export interface SessionEvent {
  id: string;
  type:
    | 'created'
    | 'started'
    | 'paused'
    | 'resumed'
    | 'recovery_needed'
    | 'recovery_confirmed'
    | 'completed'
    | 'aborted';
  at: string;
  detail: string;
}

export interface ActiveSessionState {
  sessionId: string;
  planId: string;
  status: SessionStatus;
  startEpochMs: number | null;
  pauseStartedAtMs: number | null;
  totalPausedMs: number;
  createdAtMs: number;
  lastPersistedAtMs: number;
  uncertaintyMs: number;
  resumeStatus: 'running' | 'paused';
  recoveryNote?: string;
  eventLog: SessionEvent[];
}

export interface RuntimeFrame {
  phaseIndex: number;
  currentPhase: PhaseDefinition | null;
  elapsedInPhaseSec: number;
  remainingInPhaseSec: number;
  totalElapsedSec: number;
  nextCue: CueEvent | null;
  nextCueInSec: number | null;
  completed: boolean;
}

export interface SavedPreset {
  id: string;
  name: string;
  recipeId: string;
  recipeName: string;
  createdAt: string;
  updatedAt: string;
  inputSnapshot: RecipeInputMap;
}

export interface ChemistryBatch {
  id: string;
  chemistryLabel: string;
  processType: ProcessType;
  mixedAt: string;
  lastUsedAt: string;
  sessionsLogged: number;
  estimatedRemainingCapacity: string;
  notes?: string;
}

export interface AlertProfile {
  id: string;
  name: string;
  audioEnabled: boolean;
  vibrationEnabled: boolean;
  visualEnabled: boolean;
  warningLeadSec: number;
}

export interface DebugLogEntry {
  id: string;
  createdAt: string;
  createdAtMs: number;
  level: DebugLogLevel;
  category: DebugLogCategory;
  event: string;
  detail?: unknown;
  recipeId?: string;
  sessionId?: string;
}

export interface DebugLogStats {
  entryCount: number;
  newestAt?: string;
  oldestAt?: string;
  lastPrunedAt?: string;
  maxEntries: number;
  maxAgeMs: number;
}

export interface DiagnosticBundle {
  appVersion: string;
  recipeVersion: string;
  selectedRecipeId?: string;
  generatedAt: string;
  plan?: SessionPlan;
  activeSession?: ActiveSessionState;
  diagnostics: string[];
  debugStats?: DebugLogStats;
  recentDebugLogs?: DebugLogEntry[];
}
