import type {
  DebugLogCategory,
  DebugLogEntry,
  DebugLogLevel
} from '../domain/types';

export const DEBUG_LOG_MAX_ENTRIES = 2500;
export const DEBUG_LOG_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 5;
export const DEBUG_LOG_DEFAULT_VIEW = 80;

const MAX_STRING_LENGTH = 280;
const MAX_ARRAY_ITEMS = 20;
const MAX_OBJECT_KEYS = 20;
const MAX_DEPTH = 4;

export interface DebugLogInput {
  level?: DebugLogLevel;
  category: DebugLogCategory;
  event: string;
  detail?: unknown;
  recipeId?: string;
  sessionId?: string;
}

interface PruneResult {
  keptEntries: DebugLogEntry[];
  removedIds: string[];
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function sanitizeDebugValue(value: unknown, depth = 0): unknown {
  if (
    value === null ||
    value === undefined ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}… (${value.length} chars)`
      : value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeDebugValue(value.message, depth + 1),
      stack: value.stack ? sanitizeDebugValue(value.stack, depth + 1) : undefined
    };
  }

  if (depth >= MAX_DEPTH) {
    return '[Max depth reached]';
  }

  if (Array.isArray(value)) {
    const trimmed = value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeDebugValue(item, depth + 1));

    if (value.length > MAX_ARRAY_ITEMS) {
      trimmed.push(`[+${value.length - MAX_ARRAY_ITEMS} more items]`);
    }

    return trimmed;
  }

  if (typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    const entries = Object.entries(objectValue).slice(0, MAX_OBJECT_KEYS);
    const result = Object.fromEntries(
      entries.map(([key, entryValue]) => [key, sanitizeDebugValue(entryValue, depth + 1)]),
    ) as Record<string, unknown>;

    if (Object.keys(objectValue).length > MAX_OBJECT_KEYS) {
      result.__trimmedKeys = Object.keys(objectValue).length - MAX_OBJECT_KEYS;
    }

    return result;
  }

  return String(value);
}

export function createDebugLogEntry(input: DebugLogInput, nowMs = Date.now()): DebugLogEntry {
  return {
    id: createId('dbg'),
    createdAt: new Date(nowMs).toISOString(),
    createdAtMs: nowMs,
    level: input.level ?? 'info',
    category: input.category,
    event: input.event,
    detail: sanitizeDebugValue(input.detail),
    recipeId: input.recipeId,
    sessionId: input.sessionId
  };
}

export function pruneDebugEntries(
  entries: DebugLogEntry[],
  nowMs = Date.now(),
  maxAgeMs = DEBUG_LOG_MAX_AGE_MS,
  maxEntries = DEBUG_LOG_MAX_ENTRIES,
): PruneResult {
  const ageCutoff = nowMs - maxAgeMs;
  const sorted = [...entries].sort((left, right) => left.createdAtMs - right.createdAtMs);
  const ageFiltered = sorted.filter((entry) => entry.createdAtMs >= ageCutoff);
  const keptEntries =
    ageFiltered.length > maxEntries
      ? ageFiltered.slice(ageFiltered.length - maxEntries)
      : ageFiltered;
  const keptIds = new Set(keptEntries.map((entry) => entry.id));
  const removedIds = sorted
    .filter((entry) => !keptIds.has(entry.id))
    .map((entry) => entry.id);

  return { keptEntries, removedIds };
}
