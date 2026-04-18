import { startTransition, useEffect, useRef, useState } from 'react';
import { defaultAlertProfiles, getRecipeById, recipes } from '../data/recipes';
import {
  clearDebugLogs,
  downloadDiagnosticsWithLogs,
  exportDiagnosticsWithLogs,
  getDebugLogState,
  logDebugEvent,
  subscribeDebugLogChanges
} from '../debug/logging';
import { formatDuration } from '../domain/format';
import { createDefaultInputState, createSessionPlan } from '../domain/planner';
import {
  abortSession,
  completeSession,
  confirmRecovery,
  createActiveSession,
  deriveRuntimeFrame,
  hydrateActiveSession,
  pauseSession,
  resumeSession,
  startSession as beginSessionState
} from '../domain/runtime';
import type {
  ActiveSessionState,
  ChemistryBatch,
  DebugLogEntry,
  DebugLogStats,
  DiagnosticBundle,
  RecipeInputMap,
  SavedPreset,
  SessionPlan
} from '../domain/types';
import {
  ChemistryPanel,
  SavedPanel,
  SettingsPanel
} from '../ui/LibraryPanels';
import { PlanReview } from '../ui/PlanReview';
import { RecipeBrowser } from '../ui/RecipeBrowser';
import { SessionConsole } from '../ui/SessionConsole';
import { SetupForm } from '../ui/SetupForm';
import {
  clearActiveSessionSnapshot,
  loadActiveSessionSnapshot,
  loadPreferences,
  resolveAlertProfile,
  saveActiveSessionSnapshot,
  savePreferences,
  type PreferenceState
} from '../storage/preferences';
import {
  listBatches,
  listPresets,
  saveBatch,
  savePreset
} from '../storage/database';

type Screen =
  | 'recipes'
  | 'setup'
  | 'plan'
  | 'session'
  | 'saved'
  | 'chemistry'
  | 'settings';

const appVersion = '0.1.0';
const recipeVersion = '2026-04-18';

const initialDrafts = Object.fromEntries(
  recipes.map((recipe) => [recipe.id, createDefaultInputState(recipe)]),
) satisfies Record<string, RecipeInputMap>;

function playCueTone() {
  if (!('AudioContext' in window || 'webkitAudioContext' in window)) {
    return;
  }

  const Context = window.AudioContext ?? (window as typeof window & {
    webkitAudioContext: typeof AudioContext;
  }).webkitAudioContext;
  const audioContext = new Context();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = 'triangle';
  oscillator.frequency.value = 880;
  gainNode.gain.value = 0.02;
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.12);
}

function getInitialPreferences() {
  const preferences = loadPreferences();

  if (
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('debug') === '1'
  ) {
    return {
      ...preferences,
      debugUnlocked: true,
      diagnosticsOpen: true
    } satisfies PreferenceState;
  }

  return preferences;
}

export function App() {
  const [screen, setScreen] = useState<Screen>('recipes');
  const [selectedRecipeId, setSelectedRecipeId] = useState(recipes[0].id);
  const [drafts, setDrafts] = useState(initialDrafts);
  const [preferences, setPreferences] = useState<PreferenceState>(getInitialPreferences);
  const [activePlan, setActivePlan] = useState<SessionPlan | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSessionState | null>(null);
  const [presets, setPresets] = useState<SavedPreset[]>([]);
  const [batches, setBatches] = useState<ChemistryBatch[]>([]);
  const [debugEntries, setDebugEntries] = useState<DebugLogEntry[]>([]);
  const [debugStats, setDebugStats] = useState<DebugLogStats | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [toast, setToast] = useState('');
  const lastCueRef = useRef('');
  const lastPhaseRef = useRef('');
  const lastSessionEventRef = useRef('');
  const screenRef = useRef<Screen>('recipes');
  const debugUnlockRef = useRef({
    count: 0,
    lastTapAtMs: 0
  });

  const selectedRecipe = getRecipeById(selectedRecipeId);
  const selectedDraft = drafts[selectedRecipeId] ?? createDefaultInputState(selectedRecipe);
  const alertProfile = resolveAlertProfile(defaultAlertProfiles, preferences);
  const draftPlan = createSessionPlan(selectedRecipeId, selectedDraft, alertProfile);
  const livePlan = activePlan ?? draftPlan;
  const runtimeFrame =
    activePlan && activeSession
      ? deriveRuntimeFrame(activePlan, activeSession, nowMs)
      : null;

  function logUiEvent(event: string, detail?: unknown) {
    logDebugEvent({
      category: 'ui',
      event,
      detail,
      recipeId: selectedRecipeId,
      sessionId: activeSession?.sessionId
    });
  }

  function showToast(message: string) {
    setToast(message);
    logDebugEvent({
      category: 'ui',
      event: 'toast_shown',
      detail: { message },
      recipeId: selectedRecipeId,
      sessionId: activeSession?.sessionId
    });
  }

  async function syncDebugState(reason: string) {
    try {
      const state = await getDebugLogState();
      setDebugEntries(state.recentEntries);
      setDebugStats(state.stats);
    } catch (error) {
      logDebugEvent({
        level: 'error',
        category: 'diagnostics',
        event: 'debug_state_sync_failed',
        detail: {
          reason,
          error
        }
      });
    }
  }

  async function refreshLocalData(reason: string) {
    logDebugEvent({
      category: 'storage',
      event: 'local_data_refresh_started',
      detail: { reason }
    });

    try {
      const [presetList, batchList] = await Promise.all([listPresets(), listBatches()]);
      setPresets(presetList);
      setBatches(batchList);
      logDebugEvent({
        category: 'storage',
        event: 'local_data_refresh_completed',
        detail: {
          reason,
          presets: presetList.length,
          batches: batchList.length
        }
      });
    } catch (error) {
      logDebugEvent({
        level: 'error',
        category: 'storage',
        event: 'local_data_refresh_failed',
        detail: {
          reason,
          error
        }
      });
      throw error;
    }
  }

  useEffect(() => {
    let cancelled = false;

    logDebugEvent({
      category: 'app',
      event: 'app_component_mounted'
    });

    void refreshLocalData('initial-load');

    const snapshot = loadActiveSessionSnapshot();

    if (snapshot && !cancelled) {
      const hydratedState = hydrateActiveSession(snapshot.state, Date.now());

      setSelectedRecipeId(snapshot.plan.recipeId);
      setDrafts((current) => ({
        ...current,
        [snapshot.plan.recipeId]: snapshot.plan.inputSnapshot
      }));
      setActivePlan(snapshot.plan);
      setActiveSession(hydratedState);
      setScreen('session');
      logDebugEvent({
        category: 'runtime',
        event: 'session_rehydrated_into_app',
        detail: {
          recipeId: snapshot.plan.recipeId,
          status: hydratedState.status
        },
        recipeId: snapshot.plan.recipeId,
        sessionId: hydratedState.sessionId
      });
    }

    if (preferences.debugUnlocked) {
      void syncDebugState('initial-load');
    }

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    if (!preferences.debugUnlocked) {
      return undefined;
    }

    void syncDebugState('subscription-start');
    const unsubscribe = subscribeDebugLogChanges(() => {
      void syncDebugState('log-change');
    });

    return unsubscribe;
  }, [preferences.debugUnlocked]);

  useEffect(() => {
    if (toast) {
      const timeout = window.setTimeout(() => setToast(''), 2200);
      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [toast]);

  useEffect(() => {
    if (screenRef.current !== screen) {
      screenRef.current = screen;
      logUiEvent('screen_changed', { screen });
    }
  }, [screen]);

  useEffect(() => {
    if (!activePlan || !activeSession) {
      clearActiveSessionSnapshot();
      return;
    }

    if (activeSession.status === 'completed' || activeSession.status === 'aborted') {
      clearActiveSessionSnapshot();
      return;
    }

    saveActiveSessionSnapshot(activePlan, {
      ...activeSession,
      lastPersistedAtMs: Date.now()
    });
  }, [activePlan, activeSession]);

  useEffect(() => {
    if (!activeSession) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 250);

    return () => window.clearInterval(interval);
  }, [activeSession]);

  useEffect(() => {
    if (!runtimeFrame || !activeSession || activeSession.status !== 'running') {
      return;
    }

    if (runtimeFrame.completed) {
      logDebugEvent({
        category: 'runtime',
        event: 'session_auto_completed',
        detail: {
          sessionId: activeSession.sessionId
        },
        recipeId: selectedRecipeId,
        sessionId: activeSession.sessionId
      });
      setActiveSession((current) =>
        current ? completeSession(current, Date.now()) : current,
      );
    }
  }, [runtimeFrame, activeSession, selectedRecipeId]);

  useEffect(() => {
    const lastSessionEvent = activeSession?.eventLog.at(-1);

    if (!lastSessionEvent || lastSessionEvent.id === lastSessionEventRef.current) {
      return;
    }

    lastSessionEventRef.current = lastSessionEvent.id;
    logDebugEvent({
      category: 'runtime',
      event: `session_event_${lastSessionEvent.type}`,
      detail: {
        detail: lastSessionEvent.detail,
        at: lastSessionEvent.at
      },
      recipeId: selectedRecipeId,
      sessionId: activeSession?.sessionId
    });
  }, [activeSession, selectedRecipeId]);

  useEffect(() => {
    if (!runtimeFrame || !activeSession || activeSession.status !== 'running') {
      return;
    }

    const exactCue =
      runtimeFrame.currentPhase?.cueEvents.find(
        (cue) => cue.atSec === runtimeFrame.elapsedInPhaseSec,
      ) ?? null;
    const cueSignalId = exactCue ? `cue:${exactCue.id}` : `phase:${runtimeFrame.phaseIndex}`;

    if (cueSignalId === lastCueRef.current) {
      return;
    }

    if (exactCue && alertProfile.vibrationEnabled && 'vibrate' in navigator) {
      navigator.vibrate?.(exactCue.style === 'strong' ? [120, 40, 120] : 90);
    }

    if (exactCue && alertProfile.audioEnabled) {
      playCueTone();
    }

    if (lastPhaseRef.current !== String(runtimeFrame.phaseIndex)) {
      lastPhaseRef.current = String(runtimeFrame.phaseIndex);
      logDebugEvent({
        category: 'runtime',
        event: 'phase_changed',
        detail: {
          phaseIndex: runtimeFrame.phaseIndex,
          phaseLabel: runtimeFrame.currentPhase?.label
        },
        recipeId: selectedRecipeId,
        sessionId: activeSession.sessionId
      });

      if (alertProfile.visualEnabled) {
        document.body.dataset.flash = 'phase';
        window.setTimeout(() => {
          delete document.body.dataset.flash;
        }, 320);
      }
    }

    if (exactCue) {
      logDebugEvent({
        category: 'runtime',
        event: 'cue_emitted',
        detail: {
          cueId: exactCue.id,
          cueLabel: exactCue.label,
          phaseLabel: runtimeFrame.currentPhase?.label,
          elapsedInPhaseSec: runtimeFrame.elapsedInPhaseSec
        },
        recipeId: selectedRecipeId,
        sessionId: activeSession.sessionId
      });
    }

    lastCueRef.current = cueSignalId;
  }, [alertProfile, activeSession, runtimeFrame, selectedRecipeId]);

  const diagnostics: DiagnosticBundle = {
    appVersion,
    recipeVersion,
    selectedRecipeId,
    generatedAt: new Date(nowMs).toISOString(),
    plan: livePlan,
    activeSession: activeSession ?? undefined,
    diagnostics: [
      `screen:${screen}`,
      `red-safe:${preferences.redSafeEnabled}`,
      `left-handed:${preferences.leftHanded}`,
      `presets:${presets.length}`,
      `batches:${batches.length}`,
      `debug-unlocked:${preferences.debugUnlocked}`
    ],
    debugStats: debugStats ?? undefined,
    recentDebugLogs: debugEntries
  };

  function updateDraft(inputId: string, value: string | number | boolean) {
    logUiEvent('draft_input_changed', {
      inputId,
      value
    });
    setDrafts((current) => ({
      ...current,
      [selectedRecipeId]: {
        ...current[selectedRecipeId],
        [inputId]: value
      }
    }));
  }

  function handleSelectRecipe(recipeId: string) {
    logUiEvent('recipe_selected', { recipeId });
    startTransition(() => {
      setSelectedRecipeId(recipeId);
      setScreen('setup');
    });
  }

  async function handleSavePreset() {
    logUiEvent('preset_save_requested', {
      recipeId: selectedRecipe.id
    });
    const now = new Date().toISOString();
    const preset: SavedPreset = {
      id: `preset-${Math.random().toString(36).slice(2, 10)}`,
      name: `${selectedRecipe.name} · ${formatDuration(draftPlan.totalDurationSec)}`,
      recipeId: selectedRecipe.id,
      recipeName: selectedRecipe.name,
      createdAt: now,
      updatedAt: now,
      inputSnapshot: selectedDraft
    };

    try {
      await savePreset(preset);
      await refreshLocalData('save-preset');
      showToast('Preset saved locally.');
    } catch (error) {
      logDebugEvent({
        level: 'error',
        category: 'ui',
        event: 'preset_save_flow_failed',
        detail: { error },
        recipeId: selectedRecipe.id
      });
      showToast('Preset save failed.');
    }
  }

  async function handleLoadPreset(presetId: string) {
    const preset = presets.find((entry) => entry.id === presetId);

    if (!preset) {
      logUiEvent('preset_load_missing', { presetId });
      return;
    }

    logUiEvent('preset_loaded', {
      presetId,
      recipeId: preset.recipeId
    });
    startTransition(() => {
      setSelectedRecipeId(preset.recipeId);
      setDrafts((current) => ({
        ...current,
        [preset.recipeId]: preset.inputSnapshot
      }));
      setScreen('setup');
    });
    showToast(`Loaded ${preset.name}.`);
  }

  function handleStartSession() {
    const now = Date.now();
    const session = beginSessionState(createActiveSession(draftPlan, now), now);

    logDebugEvent({
      category: 'runtime',
      event: 'session_start_requested',
      detail: {
        recipeId: selectedRecipe.id,
        planId: draftPlan.id
      },
      recipeId: selectedRecipe.id,
      sessionId: session.sessionId
    });
    setActivePlan(draftPlan);
    setActiveSession(session);
    setScreen('session');
  }

  async function handleLogBatch() {
    const plan = activePlan ?? draftPlan;
    const now = new Date().toISOString();
    const batch: ChemistryBatch = {
      id: `batch-${Math.random().toString(36).slice(2, 10)}`,
      chemistryLabel: selectedRecipe.developerLabel,
      processType: selectedRecipe.processType,
      mixedAt: now,
      lastUsedAt: now,
      sessionsLogged: 1,
      estimatedRemainingCapacity:
        plan.capacityCheck?.status === 'danger'
          ? 'Capacity already strained'
          : selectedRecipe.processType === 'color'
            ? 'Track per roll in next revision'
            : 'Comfortable for another similar session',
      notes: `Logged from ${plan.recipeName}.`
    };

    try {
      logUiEvent('batch_log_requested', {
        chemistryLabel: batch.chemistryLabel
      });
      await saveBatch(batch);
      await refreshLocalData('save-batch');
      showToast('Chemistry batch logged.');
    } catch (error) {
      logDebugEvent({
        level: 'error',
        category: 'ui',
        event: 'batch_log_failed',
        detail: { error }
      });
      showToast('Chemistry batch log failed.');
    }
  }

  async function handleCopyDiagnostics() {
    try {
      const content = await exportDiagnosticsWithLogs(diagnostics);
      await navigator.clipboard.writeText(content);
      logUiEvent('diagnostics_copied');
      showToast('Diagnostics copied.');
    } catch (error) {
      logDebugEvent({
        level: 'error',
        category: 'diagnostics',
        event: 'diagnostics_copy_failed',
        detail: { error }
      });
      showToast('Clipboard copy failed.');
    }
  }

  async function handleDownloadDebugLogs() {
    try {
      await downloadDiagnosticsWithLogs(diagnostics);
      logUiEvent('diagnostics_downloaded');
      showToast('Debug file downloaded.');
    } catch (error) {
      logDebugEvent({
        level: 'error',
        category: 'diagnostics',
        event: 'diagnostics_download_failed',
        detail: { error }
      });
      showToast('Debug download failed.');
    }
  }

  async function handleClearDebugLogs() {
    await clearDebugLogs();
    logDebugEvent({
      category: 'diagnostics',
      event: 'debug_logs_cleared_manually'
    });
    await syncDebugState('manual-clear');
    showToast('Hidden debug log cleared.');
  }

  async function handleRecordBreadcrumb() {
    logDebugEvent({
      category: 'diagnostics',
      event: 'manual_breadcrumb_recorded',
      detail: {
        screen,
        recipeId: selectedRecipeId,
        hasActiveSession: Boolean(activeSession),
        hasActivePlan: Boolean(activePlan)
      },
      recipeId: selectedRecipeId,
      sessionId: activeSession?.sessionId
    });
    await syncDebugState('manual-breadcrumb');
    showToast('Debug breadcrumb recorded.');
  }

  function handleResetSession() {
    logUiEvent('session_reset_to_recipes');
    setActivePlan(null);
    setActiveSession(null);
    setScreen('recipes');
  }

  function handleSecretDebugTap() {
    const now = Date.now();
    const withinWindow = now - debugUnlockRef.current.lastTapAtMs < 1600;
    debugUnlockRef.current.count = withinWindow ? debugUnlockRef.current.count + 1 : 1;
    debugUnlockRef.current.lastTapAtMs = now;

    if (debugUnlockRef.current.count >= 7 && !preferences.debugUnlocked) {
      debugUnlockRef.current.count = 0;
      setPreferences((current) => ({
        ...current,
        debugUnlocked: true,
        diagnosticsOpen: true
      }));
      logDebugEvent({
        category: 'diagnostics',
        event: 'debug_tools_unlocked_secret_tap'
      });
      showToast('Hidden debug tools unlocked.');
    }
  }

  function handleNavigate(nextScreen: Screen) {
    logUiEvent('bottom_nav_selected', { nextScreen });
    setScreen(nextScreen);
  }

  function handleToggleRedSafe() {
    logUiEvent('red_safe_toggled', {
      nextValue: !preferences.redSafeEnabled
    });
    setPreferences((current) => ({
      ...current,
      redSafeEnabled: !current.redSafeEnabled
    }));
  }

  function handleToggleHandedness() {
    logUiEvent('handedness_toggled', {
      nextValue: !preferences.leftHanded
    });
    setPreferences((current) => ({
      ...current,
      leftHanded: !current.leftHanded
    }));
  }

  function handleToggleDiagnostics() {
    logUiEvent('diagnostics_visibility_toggled', {
      nextValue: !preferences.diagnosticsOpen
    });
    setPreferences((current) => ({
      ...current,
      diagnosticsOpen: !current.diagnosticsOpen
    }));
  }

  const lastBatchForSelectedRecipe = batches.find(
    (batch) => batch.chemistryLabel === selectedRecipe.developerLabel,
  );

  return (
    <div
      className={[
        'app-shell',
        preferences.redSafeEnabled ? 'is-red-safe' : '',
        preferences.leftHanded ? 'is-left-handed' : ''
      ].join(' ')}
    >
      <div className="app-backdrop" />
      <main className="app-frame">
        <header className="topbar">
          <button type="button" className="brand-button" onClick={handleSecretDebugTap}>
            <p className="eyebrow">Film Dev</p>
            <strong>Offline darkroom companion</strong>
          </button>
          <div className="topbar__tools">
            <button type="button" className="icon-button" onClick={handleToggleRedSafe}>
              {preferences.redSafeEnabled ? 'White light' : 'Red-safe'}
            </button>
          </div>
        </header>

        <div className="content-shell">
          {screen === 'recipes' ? (
            <RecipeBrowser
              recipes={recipes}
              selectedRecipeId={selectedRecipeId}
              onSelect={handleSelectRecipe}
            />
          ) : null}

          {screen === 'setup' ? (
            <section className="stack">
              <SetupForm recipe={selectedRecipe} values={selectedDraft} onChange={updateDraft} />
              <div className="action-row">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => handleNavigate('recipes')}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => handleNavigate('plan')}
                >
                  Review plan
                </button>
              </div>
            </section>
          ) : null}

          {screen === 'plan' ? (
            <PlanReview
              recipe={selectedRecipe}
              plan={draftPlan}
              onSavePreset={handleSavePreset}
              onStartSession={handleStartSession}
            />
          ) : null}

          {screen === 'session' && activePlan && activeSession && runtimeFrame ? (
            <SessionConsole
              recipe={selectedRecipe}
              plan={activePlan}
              state={activeSession}
              frame={runtimeFrame}
              onStart={() => {
                logUiEvent('session_started_from_console');
                setActiveSession((current) =>
                  current ? beginSessionState(current, Date.now()) : current,
                );
              }}
              onPause={() => {
                logUiEvent('session_paused_from_console');
                setActiveSession((current) =>
                  current ? pauseSession(current, Date.now()) : current,
                );
              }}
              onResume={() => {
                logUiEvent('session_resumed_from_console');
                setActiveSession((current) =>
                  current ? resumeSession(current, Date.now()) : current,
                );
              }}
              onConfirmRecovery={() => {
                logUiEvent('session_recovery_confirmed');
                setActiveSession((current) =>
                  current ? confirmRecovery(current, Date.now()) : current,
                );
              }}
              onAbort={() => {
                logUiEvent('session_aborted');
                setActiveSession((current) =>
                  current ? abortSession(current, Date.now()) : current,
                );
              }}
              onReset={handleResetSession}
              onLogBatch={handleLogBatch}
              lastLoggedBatch={lastBatchForSelectedRecipe}
            />
          ) : null}

          {screen === 'saved' ? (
            <SavedPanel presets={presets} onLoadPreset={handleLoadPreset} />
          ) : null}

          {screen === 'chemistry' ? <ChemistryPanel batches={batches} /> : null}

          {screen === 'settings' ? (
            <SettingsPanel
              preferences={preferences}
              diagnostics={diagnostics}
              debugEntries={debugEntries}
              debugStats={debugStats}
              onToggleRedSafe={handleToggleRedSafe}
              onToggleHandedness={handleToggleHandedness}
              onToggleDiagnostics={handleToggleDiagnostics}
              onCopyDiagnostics={handleCopyDiagnostics}
              onDownloadDebugLogs={handleDownloadDebugLogs}
              onRefreshDebugLogs={() => void syncDebugState('manual-refresh')}
              onClearDebugLogs={() => void handleClearDebugLogs()}
              onRecordBreadcrumb={() => void handleRecordBreadcrumb()}
            />
          ) : null}
        </div>

        {screen !== 'session' ? (
          <nav className="bottom-nav">
            <button
              type="button"
              className={screen === 'recipes' ? 'is-active' : ''}
              onClick={() => handleNavigate('recipes')}
            >
              Recipes
            </button>
            <button
              type="button"
              className={screen === 'saved' ? 'is-active' : ''}
              onClick={() => handleNavigate('saved')}
            >
              Saved
            </button>
            <button
              type="button"
              className={screen === 'chemistry' ? 'is-active' : ''}
              onClick={() => handleNavigate('chemistry')}
            >
              Chemistry
            </button>
            <button
              type="button"
              className={screen === 'settings' ? 'is-active' : ''}
              onClick={() => handleNavigate('settings')}
            >
              Settings
            </button>
          </nav>
        ) : null}

        {toast ? <div className="toast">{toast}</div> : null}
      </main>
    </div>
  );
}
