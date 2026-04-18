import type {
  DebugLogEntry,
  DebugLogStats,
  DiagnosticBundle
} from '../domain/types';
import {
  DEBUG_LOG_DEFAULT_VIEW,
  DEBUG_LOG_MAX_AGE_MS,
  DEBUG_LOG_MAX_ENTRIES,
  createDebugLogEntry,
  type DebugLogInput
} from './logModel';
import {
  appendDebugEntry,
  clearStoredDebugEntries,
  getStoredDebugLogStats,
  listStoredDebugEntries,
  pruneStoredDebugEntries
} from '../storage/debugLogStore';

let loggerInitialized = false;
let writeCount = 0;
let writeQueue = Promise.resolve();
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function queueWrite(task: () => Promise<void>) {
  writeQueue = writeQueue
    .then(task)
    .catch((error) => {
      console.error('Debug logger write failed', error);
    });

  return writeQueue;
}

export function logDebugEvent(input: DebugLogInput) {
  const entry = createDebugLogEntry(input);

  if (import.meta.env.DEV) {
    const consoleMethod =
      entry.level === 'error'
        ? console.error
        : entry.level === 'warn'
          ? console.warn
          : console.debug;
    consoleMethod(`[debug:${entry.category}] ${entry.event}`, entry.detail);
  }

  void queueWrite(async () => {
    await appendDebugEntry(entry);
    writeCount += 1;

    if (writeCount === 1 || writeCount % 25 === 0) {
      await pruneStoredDebugEntries(Date.now(), DEBUG_LOG_MAX_AGE_MS, DEBUG_LOG_MAX_ENTRIES);
    }

    emitChange();
  });

  return entry;
}

export function subscribeDebugLogChanges(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function initializeDebugLifecycleLogging() {
  if (loggerInitialized || typeof window === 'undefined') {
    return;
  }

  loggerInitialized = true;

  logDebugEvent({
    category: 'lifecycle',
    event: 'logger_initialized',
    detail: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      baseUrl: import.meta.env.BASE_URL
    }
  });

  window.addEventListener('error', (event) => {
    logDebugEvent({
      level: 'error',
      category: 'error',
      event: 'window_error',
      detail: {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logDebugEvent({
      level: 'error',
      category: 'error',
      event: 'unhandled_rejection',
      detail: {
        reason: event.reason
      }
    });
  });

  document.addEventListener('visibilitychange', () => {
    logDebugEvent({
      category: 'lifecycle',
      event: 'visibility_changed',
      detail: {
        visibilityState: document.visibilityState
      }
    });
  });

  window.addEventListener('online', () => {
    logDebugEvent({ category: 'lifecycle', event: 'browser_online' });
  });

  window.addEventListener('offline', () => {
    logDebugEvent({
      level: 'warn',
      category: 'lifecycle',
      event: 'browser_offline'
    });
  });

  window.addEventListener('pageshow', () => {
    logDebugEvent({ category: 'lifecycle', event: 'page_show' });
  });

  window.addEventListener('pagehide', () => {
    logDebugEvent({ category: 'lifecycle', event: 'page_hide' });
  });
}

export async function getDebugLogState(limit = DEBUG_LOG_DEFAULT_VIEW) {
  const [recentEntries, stats] = await Promise.all([
    listStoredDebugEntries(limit),
    getStoredDebugLogStats(DEBUG_LOG_MAX_ENTRIES, DEBUG_LOG_MAX_AGE_MS)
  ]);

  return {
    recentEntries,
    stats
  } satisfies {
    recentEntries: DebugLogEntry[];
    stats: DebugLogStats;
  };
}

export async function clearDebugLogs() {
  await clearStoredDebugEntries();
  emitChange();
}

export async function exportDiagnosticsWithLogs(bundle: DiagnosticBundle) {
  const { recentEntries, stats } = await getDebugLogState(250);

  return JSON.stringify(
    {
      ...bundle,
      debugStats: stats,
      recentDebugLogs: recentEntries
    },
    null,
    2,
  );
}

export async function downloadDiagnosticsWithLogs(bundle: DiagnosticBundle) {
  const content = await exportDiagnosticsWithLogs(bundle);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `film-dev-debug-${new Date().toISOString().replaceAll(':', '-')}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
