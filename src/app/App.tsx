import {
  startTransition,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { defaultAlertProfiles, getRecipeById, recipes } from "../data/recipes";
import {
  clearDebugLogs,
  downloadDiagnosticsWithLogs,
  exportDiagnosticsWithLogs,
  getDebugLogState,
  logDebugEvent,
  subscribeDebugLogChanges,
} from "../debug/logging";
import { formatDuration } from "../domain/format";
import { createDefaultMixWorkspaceState } from "../domain/mix";
import {
  createDefaultInputState,
  createSessionPlan,
  normalizeInputState,
} from "../domain/planner";
import {
  abortSession,
  completeSession,
  completeManualPhase,
  confirmPhaseStart,
  confirmRecovery,
  createActiveSession,
  deriveRuntimeFrame,
  hydrateActiveSession,
  pauseSession,
  resumeSession,
  startSession as beginSessionState,
  waitForPhaseConfirmation,
} from "../domain/runtime";
import type {
  ActiveSessionState,
  DebugLogEntry,
  DebugLogStats,
  DiagnosticBundle,
  MixWorkspaceState,
  RecipeInputMap,
  SavedPreset,
  SessionPlan,
  ThemeMode,
} from "../domain/types";
import { AboutPanel } from "../ui/AboutPanel";
import { MixPanel } from "../ui/MixPanel";
import { SavedPanel, SettingsPanel } from "../ui/LibraryPanels";
import {
  BookIcon,
  BookmarkIcon,
  ChevronLeftIcon,
  ClipboardIcon,
  FlaskIcon,
  ShieldIcon,
  SlidersIcon,
  SunIcon,
  WarningIcon,
} from "../ui/icons";
import { PlanReview } from "../ui/PlanReview";
import { RecipeBrowser } from "../ui/RecipeBrowser";
import { SessionConsole } from "../ui/SessionConsole";
import { SetupForm } from "../ui/SetupForm";
import * as sessionAudio from "./sessionAudio";
import {
  clearActiveSessionSnapshot,
  loadActiveSessionSnapshot,
  loadPreferences,
  resolveAlertProfile,
  saveActiveSessionSnapshot,
  savePreferences,
  type PreferenceState,
} from "../storage/preferences";
import { listPresets, savePreset } from "../storage/database";

type Screen =
  | "recipes"
  | "mix"
  | "setup"
  | "plan"
  | "session"
  | "saved"
  | "about"
  | "settings";

const appVersion = "0.1.0";
const recipeVersion = "2026-04-18";
type ScreenTransitionDirection = "forward" | "back" | "lateral";

const initialDrafts = Object.fromEntries(
  recipes.map((recipe) => [recipe.id, createDefaultInputState(recipe)]),
) satisfies Record<string, RecipeInputMap>;

const navigationItems = [
  {
    screen: "recipes",
    label: "Recipes",
    icon: BookIcon,
  },
  {
    screen: "mix",
    label: "Mix",
    icon: FlaskIcon,
  },
  {
    screen: "saved",
    label: "Saved",
    icon: BookmarkIcon,
  },
  {
    screen: "settings",
    label: "Settings",
    icon: SlidersIcon,
  },
] satisfies Array<{
  screen: Exclude<Screen, "setup" | "plan" | "session" | "about">;
  label: string;
  icon: typeof BookIcon;
}>;

const screenLabels: Record<Screen, string> = {
  recipes: "Recipes",
  mix: "Mix",
  setup: "Setup",
  plan: "Review",
  session: "Darkroom",
  saved: "Saved",
  about: "About",
  settings: "Settings",
};

function buildExportFileName(label: string) {
  const stamp = new Date().toISOString().replaceAll(":", "-");
  return `film-dev-${label}-${stamp}.json`;
}

function downloadJsonFile(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function resetViewPosition(frame: HTMLElement | null) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (typeof window.scrollTo === "function") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  } catch {
    // jsdom and some embedded browsers may not implement scrollTo fully.
  }

  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  try {
    frame?.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
  } catch {
    frame?.scrollTo?.(0, 0);
  }
}

function getInitialPreferences() {
  const preferences = loadPreferences();

  if (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("debug") === "1"
  ) {
    return {
      ...preferences,
      debugUnlocked: true,
      diagnosticsOpen: true,
    } satisfies PreferenceState;
  }

  return preferences;
}

export function App() {
  const [screen, setScreen] = useState<Screen>("recipes");
  const [aboutReturnScreen, setAboutReturnScreen] = useState<Screen>("recipes");
  const [selectedRecipeId, setSelectedRecipeId] = useState(recipes[0].id);
  const [drafts, setDrafts] = useState(initialDrafts);
  const [mixWorkspace, setMixWorkspace] = useState<MixWorkspaceState>(
    createDefaultMixWorkspaceState,
  );
  const [preferences, setPreferences] = useState<PreferenceState>(
    getInitialPreferences,
  );
  const [activePlan, setActivePlan] = useState<SessionPlan | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSessionState | null>(
    null,
  );
  const [presets, setPresets] = useState<SavedPreset[]>([]);
  const [debugEntries, setDebugEntries] = useState<DebugLogEntry[]>([]);
  const [debugStats, setDebugStats] = useState<DebugLogStats | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [toast, setToast] = useState("");
  const [screenTransitionDirection, setScreenTransitionDirection] =
    useState<ScreenTransitionDirection>("lateral");
  const [setupWarningIgnored, setSetupWarningIgnored] = useState(false);
  const lastCueRef = useRef("");
  const lastActiveCuePulseRef = useRef("");
  const lastPhaseRef = useRef("");
  const lastSessionEventRef = useRef("");
  const lastSessionIdRef = useRef<string | null>(null);
  const screenRef = useRef<Screen>("recipes");
  const renderedScreenRef = useRef<Screen>("recipes");
  const debugUnlockRef = useRef({
    count: 0,
    lastTapAtMs: 0,
  });
  const appFrameRef = useRef<HTMLElement | null>(null);

  const selectedRecipe = getRecipeById(selectedRecipeId);
  const selectedDraft = normalizeInputState(
    selectedRecipe,
    drafts[selectedRecipeId],
  );
  const alertProfile = resolveAlertProfile(defaultAlertProfiles, preferences);
  const draftPlan = createSessionPlan(
    selectedRecipeId,
    selectedDraft,
    alertProfile,
  );
  const livePlan = activePlan ?? draftPlan;
  const runtimeFrame =
    activePlan && activeSession
      ? deriveRuntimeFrame(activePlan, activeSession, nowMs)
      : null;
  const quickThemeLabel =
    preferences.themeMode === "standard"
      ? "Switch to Red safe"
      : "Switch to White light";
  const quickThemeCompactLabel =
    preferences.themeMode === "standard" ? "Red safe" : "White light";
  const headerEyebrow =
    screen === "setup" || screen === "plan" || screen === "session"
      ? selectedRecipe.name
      : "Film Dev";
  const headerTitle =
    screen === "mix"
      ? "Mix calculator"
      : screen === "saved"
        ? "Saved presets"
        : screen === "plan"
          ? "Review plan"
          : screen === "session"
            ? "Darkroom session"
            : screen === "about"
              ? "About Film Dev"
              : screenLabels[screen];
  const headerSubtitle =
    screen === "recipes"
      ? "Offline film developing guide"
      : screen === "mix"
        ? "Chemistry math without panic"
        : screen === "saved"
          ? "Trusted setups you can reload fast"
          : screen === "settings"
            ? "Darkroom modes, interaction, and diagnostics"
            : screen === "about"
              ? "Who made this and why it exists"
              : null;
  const backTarget =
    screen === "setup"
      ? "recipes"
      : screen === "plan"
        ? "setup"
        : screen === "about"
          ? aboutReturnScreen
          : null;
  const topbarBackLabel = backTarget ? "Back" : "Home";
  const showBackButton = backTarget !== null;
  const showAboutLink = screen !== "about";
  const showSetupWarningBanner =
    screen === "setup" &&
    draftPlan.blockingIssues.length > 0 &&
    !setupWarningIgnored;

  function logUiEvent(event: string, detail?: unknown) {
    logDebugEvent({
      category: "ui",
      event,
      detail,
      recipeId: selectedRecipeId,
      sessionId: activeSession?.sessionId,
    });
  }

  function logPlannerEvent(event: string, plan: SessionPlan, detail?: unknown) {
    logDebugEvent({
      category: "planner",
      event,
      detail: {
        planId: plan.id,
        warnings: plan.warnings,
        capacityCheck: plan.capacityCheck,
        calculationTrace: plan.calculationTrace,
        ...((detail as Record<string, unknown> | undefined) ?? {}),
      },
      recipeId: plan.recipeId,
      sessionId: activeSession?.sessionId,
    });
  }

  function showToast(message: string) {
    setToast(message);
    logDebugEvent({
      category: "ui",
      event: "toast_shown",
      detail: { message },
      recipeId: selectedRecipeId,
      sessionId: activeSession?.sessionId,
    });
  }

  async function syncDebugState(reason: string) {
    try {
      const state = await getDebugLogState();
      setDebugEntries(state.recentEntries);
      setDebugStats(state.stats);
    } catch (error) {
      logDebugEvent({
        level: "error",
        category: "diagnostics",
        event: "debug_state_sync_failed",
        detail: {
          reason,
          error,
        },
      });
    }
  }

  async function refreshLocalData(reason: string) {
    logDebugEvent({
      category: "storage",
      event: "local_data_refresh_started",
      detail: { reason },
    });

    try {
      const presetList = await listPresets();
      setPresets(presetList);
      logDebugEvent({
        category: "storage",
        event: "local_data_refresh_completed",
        detail: {
          reason,
          presets: presetList.length,
        },
      });
    } catch (error) {
      logDebugEvent({
        level: "error",
        category: "storage",
        event: "local_data_refresh_failed",
        detail: {
          reason,
          error,
        },
      });
      throw error;
    }
  }

  useEffect(() => {
    let cancelled = false;

    logDebugEvent({
      category: "app",
      event: "app_component_mounted",
    });

    void refreshLocalData("initial-load");

    const snapshot = loadActiveSessionSnapshot();

    if (snapshot && !cancelled) {
      const hydratedState = hydrateActiveSession(snapshot.state, Date.now());

      setSelectedRecipeId(snapshot.plan.recipeId);
      setDrafts((current) => ({
        ...current,
        [snapshot.plan.recipeId]: snapshot.plan.inputSnapshot,
      }));
      setActivePlan(snapshot.plan);
      setActiveSession(hydratedState);
      setScreen("session");
      logDebugEvent({
        category: "runtime",
        event: "session_rehydrated_into_app",
        detail: {
          recipeId: snapshot.plan.recipeId,
          status: hydratedState.status,
        },
        recipeId: snapshot.plan.recipeId,
        sessionId: hydratedState.sessionId,
      });
    }

    if (preferences.debugUnlocked) {
      void syncDebugState("initial-load");
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

    void syncDebugState("subscription-start");
    const unsubscribe = subscribeDebugLogChanges(() => {
      void syncDebugState("log-change");
    });

    return unsubscribe;
  }, [preferences.debugUnlocked]);

  useEffect(() => {
    if (toast) {
      const timeout = window.setTimeout(() => setToast(""), 2200);
      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [toast]);

  useLayoutEffect(() => {
    if (renderedScreenRef.current === screen) {
      return;
    }

    renderedScreenRef.current = screen;
    resetViewPosition(appFrameRef.current);
  }, [screen]);

  useEffect(() => {
    if (screenRef.current !== screen) {
      screenRef.current = screen;
      logUiEvent("screen_changed", { screen });
    }
  }, [screen]);

  useEffect(() => {
    document.title =
      screen === "setup" || screen === "plan" || screen === "session"
        ? `Film Dev · ${selectedRecipe.name}`
        : screen === "about"
          ? "Film Dev · About"
          : `Film Dev · ${screenLabels[screen]}`;
  }, [screen, selectedRecipe.name]);

  useEffect(() => {
    const themeColor =
      preferences.themeMode === "standard"
        ? "#0d0f10"
        : preferences.themeMode === "red_safe"
          ? "#2a0408"
          : "#4a0004";
    const meta =
      document.querySelector('meta[name="theme-color"]') ??
      document.head.appendChild(document.createElement("meta"));
    meta.setAttribute("name", "theme-color");
    meta?.setAttribute("content", themeColor);
  }, [preferences.themeMode]);

  useEffect(() => {
    if (!activePlan || !activeSession) {
      clearActiveSessionSnapshot();
      return;
    }

    if (
      activeSession.status === "completed" ||
      activeSession.status === "aborted"
    ) {
      clearActiveSessionSnapshot();
      return;
    }

    saveActiveSessionSnapshot(activePlan, {
      ...activeSession,
      lastPersistedAtMs: Date.now(),
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
    const sessionId = activeSession?.sessionId ?? null;

    if (lastSessionIdRef.current === sessionId) {
      return;
    }

    lastSessionIdRef.current = sessionId;
    lastCueRef.current = "";
    lastActiveCuePulseRef.current = "";
    lastPhaseRef.current = "";
    lastSessionEventRef.current = "";
  }, [activeSession?.sessionId]);

  useEffect(() => {
    if (!runtimeFrame || !activeSession || activeSession.status !== "running") {
      return;
    }

    if (runtimeFrame.completed) {
      logDebugEvent({
        category: "runtime",
        event: "session_auto_completed",
        detail: {
          sessionId: activeSession.sessionId,
        },
        recipeId: selectedRecipeId,
        sessionId: activeSession.sessionId,
      });
      setActiveSession((current) =>
        current ? completeSession(current, Date.now()) : current,
      );
    }
  }, [runtimeFrame, activeSession, selectedRecipeId]);

  useEffect(() => {
    const lastSessionEvent = activeSession?.eventLog.at(-1);

    if (
      !lastSessionEvent ||
      lastSessionEvent.id === lastSessionEventRef.current
    ) {
      return;
    }

    lastSessionEventRef.current = lastSessionEvent.id;
    logDebugEvent({
      category: "runtime",
      event: `session_event_${lastSessionEvent.type}`,
      detail: {
        detail: lastSessionEvent.detail,
        at: lastSessionEvent.at,
      },
      recipeId: selectedRecipeId,
      sessionId: activeSession?.sessionId,
    });

    if (!alertProfile.audioEnabled || !runtimeFrame?.currentPhase) {
      return;
    }

    if (
      (lastSessionEvent.type === "started" ||
        lastSessionEvent.type === "phase_wait_confirmed") &&
      runtimeFrame.currentPhase.timerMode !== "manual" &&
      !sessionAudio.phaseHasImmediateCue(runtimeFrame.currentPhase)
    ) {
      const toneKinds = [
        sessionAudio.resolvePhaseStartToneKind(runtimeFrame.currentPhase),
      ] as const;

      sessionAudio.playToneSequence(toneKinds);
      logDebugEvent({
        category: "runtime",
        event: "audio_emitted",
        detail: {
          source: `session_event_${lastSessionEvent.type}`,
          toneKinds,
          phaseLabel: runtimeFrame.currentPhase.label,
        },
        recipeId: selectedRecipeId,
        sessionId: activeSession?.sessionId,
      });
    }
  }, [
    activeSession,
    alertProfile.audioEnabled,
    runtimeFrame,
    selectedRecipeId,
  ]);

  useEffect(() => {
    if (!runtimeFrame || !activeSession) {
      return;
    }

    const phaseSignature = `${activeSession.sessionId}:${runtimeFrame.phaseIndex}`;
    const previousSignature = lastPhaseRef.current;

    if (phaseSignature === previousSignature) {
      return;
    }

    lastPhaseRef.current = phaseSignature;

    if (activeSession.status !== "running") {
      return;
    }

    const isFirstObservedPhase =
      !previousSignature ||
      !previousSignature.startsWith(`${activeSession.sessionId}:`);

    if (isFirstObservedPhase) {
      return;
    }

    const nextPhaseLabel = runtimeFrame.currentPhase?.label ?? "Next step";
    const previousPhaseIndex = Number.parseInt(
      previousSignature.split(":").at(-1) ?? "",
      10,
    );
    const previousPhase =
      Number.isFinite(previousPhaseIndex) &&
      previousSignature.startsWith(`${activeSession.sessionId}:`)
        ? (livePlan.phaseList[previousPhaseIndex] ?? null)
        : null;
    const shouldGateNextPhase =
      runtimeFrame.currentPhase?.timerMode === "manual" ||
      preferences.phaseConfirmationEnabled;

    logDebugEvent({
      category: "runtime",
      event: "phase_changed",
      detail: {
        phaseIndex: runtimeFrame.phaseIndex,
        phaseLabel: runtimeFrame.currentPhase?.label,
      },
      recipeId: selectedRecipeId,
      sessionId: activeSession.sessionId,
    });

    if (alertProfile.audioEnabled) {
      const toneKinds = sessionAudio.buildPhaseTransitionToneKinds(
        previousPhase,
        runtimeFrame.currentPhase,
        {
          includeStartTone: !shouldGateNextPhase,
        },
      );

      if (toneKinds.length > 0) {
        sessionAudio.playToneSequence(toneKinds);
        logDebugEvent({
          category: "runtime",
          event: "audio_emitted",
          detail: {
            source: "phase_changed",
            toneKinds,
            previousPhaseLabel: previousPhase?.label,
            nextPhaseLabel: runtimeFrame.currentPhase?.label,
          },
          recipeId: selectedRecipeId,
          sessionId: activeSession.sessionId,
        });
      }
    }

    if (shouldGateNextPhase) {
      logUiEvent("phase_wait_requested", {
        phaseIndex: runtimeFrame.phaseIndex,
        phaseLabel: nextPhaseLabel,
        timerMode: runtimeFrame.currentPhase?.timerMode ?? "countdown",
      });
      setActiveSession((current) =>
        current && current.status === "running"
          ? waitForPhaseConfirmation(current, Date.now(), nextPhaseLabel)
          : current,
      );
      return;
    }

    if (alertProfile.visualEnabled) {
      document.body.dataset.flash = "phase";
      window.setTimeout(() => {
        delete document.body.dataset.flash;
      }, 320);
    }
  }, [
    alertProfile.visualEnabled,
    activeSession,
    preferences.phaseConfirmationEnabled,
    runtimeFrame,
    selectedRecipeId,
  ]);

  useEffect(() => {
    if (!runtimeFrame || !activeSession || activeSession.status !== "running") {
      return;
    }

    const exactCue =
      runtimeFrame.currentPhase?.cueEvents.find(
        (cue) => cue.atSec === runtimeFrame.elapsedInPhaseSec,
      ) ?? null;
    const cueSignalId = exactCue
      ? `cue:${exactCue.id}`
      : `phase:${runtimeFrame.phaseIndex}`;

    if (cueSignalId === lastCueRef.current) {
      return;
    }

    if (exactCue && alertProfile.vibrationEnabled && "vibrate" in navigator) {
      navigator.vibrate?.(exactCue.style === "strong" ? [120, 40, 120] : 90);
    }

    if (exactCue && alertProfile.audioEnabled) {
      const toneKinds = [sessionAudio.resolveCueToneKind(exactCue)] as const;

      sessionAudio.playToneSequence(toneKinds);
      logDebugEvent({
        category: "runtime",
        event: "audio_emitted",
        detail: {
          source: "cue_emitted",
          toneKinds,
          cueId: exactCue.id,
          cueLabel: exactCue.label,
        },
        recipeId: selectedRecipeId,
        sessionId: activeSession.sessionId,
      });
    }

    if (exactCue) {
      logDebugEvent({
        category: "runtime",
        event: "cue_emitted",
        detail: {
          cueId: exactCue.id,
          cueLabel: exactCue.label,
          phaseLabel: runtimeFrame.currentPhase?.label,
          elapsedInPhaseSec: runtimeFrame.elapsedInPhaseSec,
        },
        recipeId: selectedRecipeId,
        sessionId: activeSession.sessionId,
      });
    }

    lastCueRef.current = cueSignalId;
  }, [alertProfile, activeSession, runtimeFrame, selectedRecipeId]);

  useEffect(() => {
    if (!runtimeFrame || !activeSession || activeSession.status !== "running") {
      return;
    }

    const activeCue = runtimeFrame.activeCue;

    if (!activeCue || runtimeFrame.elapsedInPhaseSec <= activeCue.atSec) {
      return;
    }

    const pulseSignalId = `${activeSession.sessionId}:${activeCue.id}:${runtimeFrame.elapsedInPhaseSec}`;

    if (pulseSignalId === lastActiveCuePulseRef.current) {
      return;
    }

    if (alertProfile.audioEnabled) {
      const toneKinds = [
        sessionAudio.resolveActiveCuePulseToneKind(activeCue),
      ] as const;

      sessionAudio.playToneSequence(toneKinds);
      logDebugEvent({
        category: "runtime",
        event: "audio_emitted",
        detail: {
          source: "active_cue_pulse",
          toneKinds,
          cueId: activeCue.id,
          cueLabel: activeCue.label,
          elapsedInPhaseSec: runtimeFrame.elapsedInPhaseSec,
        },
        recipeId: selectedRecipeId,
        sessionId: activeSession.sessionId,
      });
    }

    lastActiveCuePulseRef.current = pulseSignalId;
  }, [
    activeSession,
    alertProfile.audioEnabled,
    runtimeFrame,
    selectedRecipeId,
  ]);

  const diagnostics: DiagnosticBundle = {
    appVersion,
    recipeVersion,
    selectedRecipeId,
    generatedAt: new Date(nowMs).toISOString(),
    plan: livePlan,
    activeSession: activeSession ?? undefined,
    diagnostics: [
      `screen:${screen}`,
      `mix-mode:${mixWorkspace.activeMode}`,
      `theme:${preferences.themeMode}`,
      `left-handed:${preferences.leftHanded}`,
      `phase-confirm:${preferences.phaseConfirmationEnabled}`,
      `presets:${presets.length}`,
      `debug-unlocked:${preferences.debugUnlocked}`,
    ],
    debugStats: debugStats ?? undefined,
    recentDebugLogs: debugEntries,
  };

  function updateDraft(inputId: string, value: string | number | boolean) {
    logUiEvent("draft_input_changed", {
      inputId,
      value,
    });
    setSetupWarningIgnored(false);
    setDrafts((current) => ({
      ...current,
      [selectedRecipeId]: {
        ...current[selectedRecipeId],
        [inputId]: value,
      },
    }));
  }

  function handleSelectRecipe(recipeId: string) {
    logUiEvent("recipe_selected", { recipeId });
    setSetupWarningIgnored(false);
    startTransition(() => {
      setScreenTransitionDirection("forward");
      setSelectedRecipeId(recipeId);
      setScreen("setup");
    });
  }

  function transitionToScreen(
    nextScreen: Screen,
    direction: ScreenTransitionDirection = "lateral",
  ) {
    if (nextScreen === screen) {
      resetViewPosition(appFrameRef.current);
      return;
    }

    startTransition(() => {
      setScreenTransitionDirection(direction);
      setScreen(nextScreen);
    });
  }

  async function handleSavePreset() {
    logUiEvent("preset_save_requested", {
      recipeId: selectedRecipe.id,
    });
    const now = new Date().toISOString();
    const preset: SavedPreset = {
      id: `preset-${Math.random().toString(36).slice(2, 10)}`,
      name: `${selectedRecipe.name} · ${formatDuration(draftPlan.totalDurationSec)}`,
      recipeId: selectedRecipe.id,
      recipeName: selectedRecipe.name,
      createdAt: now,
      updatedAt: now,
      inputSnapshot: selectedDraft,
    };

    try {
      await savePreset(preset);
      await refreshLocalData("save-preset");
      showToast("Preset saved.");
    } catch (error) {
      logDebugEvent({
        level: "error",
        category: "ui",
        event: "preset_save_flow_failed",
        detail: { error },
        recipeId: selectedRecipe.id,
      });
      showToast("Couldn't save the preset.");
    }
  }

  async function handleLoadPreset(presetId: string) {
    const preset = presets.find((entry) => entry.id === presetId);

    if (!preset) {
      logUiEvent("preset_load_missing", { presetId });
      return;
    }

    logUiEvent("preset_loaded", {
      presetId,
      recipeId: preset.recipeId,
    });
    setSetupWarningIgnored(false);
    startTransition(() => {
      setScreenTransitionDirection("forward");
      setSelectedRecipeId(preset.recipeId);
      setDrafts((current) => ({
        ...current,
        [preset.recipeId]: preset.inputSnapshot,
      }));
      setScreen("setup");
    });
    showToast(`Loaded ${preset.name}.`);
  }

  function handleStartSession() {
    if (draftPlan.blockingIssues.length > 0) {
      logUiEvent("session_start_blocked", {
        blockingIssues: draftPlan.blockingIssues,
      });
      showToast("Pick a supported DF96 combo before starting.");
      return;
    }

    const now = Date.now();
    const session = beginSessionState(createActiveSession(draftPlan, now), now);

    logPlannerEvent("plan_committed_to_session", draftPlan, {
      screen,
      nextSessionId: session.sessionId,
    });
    logDebugEvent({
      category: "runtime",
      event: "session_start_requested",
      detail: {
        recipeId: selectedRecipe.id,
        planId: draftPlan.id,
      },
      recipeId: selectedRecipe.id,
      sessionId: session.sessionId,
    });
    setActivePlan(draftPlan);
    setActiveSession(session);
    transitionToScreen("session", "forward");
  }

  async function handleCopyDiagnostics() {
    try {
      const content = await exportDiagnosticsWithLogs(diagnostics);
      await navigator.clipboard.writeText(content);
      logUiEvent("diagnostics_copied");
      showToast("Diagnostics copied.");
    } catch (error) {
      logDebugEvent({
        level: "error",
        category: "diagnostics",
        event: "diagnostics_copy_failed",
        detail: { error },
      });
      showToast("Couldn't copy diagnostics.");
    }
  }

  async function handleDownloadDebugLogs() {
    try {
      await downloadDiagnosticsWithLogs(diagnostics);
      logUiEvent("diagnostics_downloaded");
      showToast("Debug file downloaded.");
    } catch (error) {
      logDebugEvent({
        level: "error",
        category: "diagnostics",
        event: "diagnostics_download_failed",
        detail: { error },
      });
      showToast("Couldn't download the debug file.");
    }
  }

  async function handleClearDebugLogs() {
    await clearDebugLogs();
    logDebugEvent({
      category: "diagnostics",
      event: "debug_logs_cleared_manually",
    });
    await syncDebugState("manual-clear");
    showToast("Hidden log cleared.");
  }

  async function handleRecordBreadcrumb() {
    logDebugEvent({
      category: "diagnostics",
      event: "manual_breadcrumb_recorded",
      detail: {
        screen,
        recipeId: selectedRecipeId,
        hasActiveSession: Boolean(activeSession),
        hasActivePlan: Boolean(activePlan),
      },
      recipeId: selectedRecipeId,
      sessionId: activeSession?.sessionId,
    });
    await syncDebugState("manual-breadcrumb");
    showToast("Breadcrumb added.");
  }

  function handleResetSession() {
    logUiEvent("session_reset_to_recipes");
    setActivePlan(null);
    setActiveSession(null);
    transitionToScreen("recipes", "back");
  }

  function handleOpenAbout() {
    logUiEvent("about_opened", { fromScreen: screen });
    setAboutReturnScreen(screen);
    transitionToScreen("about", "forward");
  }

  function handleTopbarBack() {
    if (!backTarget) {
      return;
    }

    logUiEvent("topbar_back_selected", {
      fromScreen: screen,
      nextScreen: backTarget,
    });
    transitionToScreen(backTarget, "back");
  }

  function handleSecretDebugTap() {
    const now = Date.now();
    const withinWindow = now - debugUnlockRef.current.lastTapAtMs < 1600;
    debugUnlockRef.current.count = withinWindow
      ? debugUnlockRef.current.count + 1
      : 1;
    debugUnlockRef.current.lastTapAtMs = now;

    if (debugUnlockRef.current.count >= 7 && !preferences.debugUnlocked) {
      debugUnlockRef.current.count = 0;
      setPreferences((current) => ({
        ...current,
        debugUnlocked: true,
        diagnosticsOpen: true,
      }));
      logDebugEvent({
        category: "diagnostics",
        event: "debug_tools_unlocked_secret_tap",
      });
      showToast("Advanced diagnostics unlocked.");
    }
  }

  function handleNavigate(nextScreen: Screen) {
    logUiEvent("bottom_nav_selected", { nextScreen });

    if (nextScreen === "plan") {
      logPlannerEvent("plan_review_requested", draftPlan, {
        fromScreen: screen,
      });
    }

    transitionToScreen(
      nextScreen,
      nextScreen === "plan" ? "forward" : "lateral",
    );
  }

  function handleSetThemeMode(mode: ThemeMode) {
    logUiEvent("theme_mode_selected", {
      nextValue: mode,
    });
    setPreferences((current) => ({
      ...current,
      themeMode: mode,
    }));
  }

  function handleQuickThemeToggle() {
    const nextMode =
      preferences.themeMode === "standard" ? "ultrared" : "standard";

    logUiEvent("theme_mode_quick_toggled", {
      currentValue: preferences.themeMode,
      nextValue: nextMode,
    });
    setPreferences((current) => ({
      ...current,
      themeMode: nextMode,
    }));
  }

  function handleToggleHandedness() {
    logUiEvent("handedness_toggled", {
      nextValue: !preferences.leftHanded,
    });
    setPreferences((current) => ({
      ...current,
      leftHanded: !current.leftHanded,
    }));
  }

  function handleToggleAnimations() {
    logUiEvent("animations_toggled", {
      nextValue: !preferences.animationsEnabled,
    });
    setPreferences((current) => ({
      ...current,
      animationsEnabled: !current.animationsEnabled,
    }));
  }

  function handleToggleButtonSounds() {
    logUiEvent("button_sounds_toggled", {
      nextValue: !preferences.buttonSoundsEnabled,
    });
    setPreferences((current) => ({
      ...current,
      buttonSoundsEnabled: !current.buttonSoundsEnabled,
    }));
  }

  function handleTogglePhaseConfirmation() {
    logUiEvent("phase_confirmation_toggled", {
      nextValue: !preferences.phaseConfirmationEnabled,
    });
    setPreferences((current) => ({
      ...current,
      phaseConfirmationEnabled: !current.phaseConfirmationEnabled,
    }));
  }

  function handleToggleDiagnostics() {
    logUiEvent("diagnostics_visibility_toggled", {
      nextValue: !preferences.diagnosticsOpen,
    });
    setPreferences((current) => ({
      ...current,
      diagnosticsOpen: !current.diagnosticsOpen,
    }));
  }

  useEffect(() => {
    if (!preferences.buttonSoundsEnabled) {
      return undefined;
    }

    function handleDocumentClick(event: MouseEvent) {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const button = target.closest("button");

      if (!button || (button as HTMLButtonElement).disabled) {
        return;
      }

      sessionAudio.playToneSequence(["button"]);
    }

    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [preferences.buttonSoundsEnabled]);

  function handleExportPresets() {
    try {
      downloadJsonFile(buildExportFileName("saved-templates"), {
        exportedAt: new Date().toISOString(),
        kind: "saved_templates",
        count: presets.length,
        presets,
      });
      logUiEvent("saved_templates_exported", {
        count: presets.length,
      });
      showToast("Presets exported.");
    } catch (error) {
      logDebugEvent({
        level: "error",
        category: "storage",
        event: "saved_templates_export_failed",
        detail: { error, count: presets.length },
      });
      showToast("Couldn't export presets.");
    }
  }

  function handleExportAllLocalData() {
    try {
      downloadJsonFile(buildExportFileName("local-data"), {
        exportedAt: new Date().toISOString(),
        kind: "all_local_data",
        preferences,
        presets,
        activePlan,
        activeSession,
      });
      logUiEvent("all_local_data_exported", {
        presets: presets.length,
        hasActivePlan: Boolean(activePlan),
        hasActiveSession: Boolean(activeSession),
      });
      showToast("All local data exported.");
    } catch (error) {
      logDebugEvent({
        level: "error",
        category: "storage",
        event: "all_local_data_export_failed",
        detail: {
          error,
          presets: presets.length,
        },
      });
      showToast("Couldn't export all local data.");
    }
  }
  const QuickThemeIcon =
    preferences.themeMode === "standard" ? ShieldIcon : SunIcon;

  return (
    <div
      className={[
        "app-shell",
        preferences.themeMode === "red_safe" ? "is-red-safe" : "",
        preferences.themeMode === "ultrared" ? "is-ultrared" : "",
        preferences.animationsEnabled ? "is-motion-rich" : "is-motion-reduced",
        preferences.leftHanded ? "is-left-handed" : "",
      ].join(" ")}
    >
      <div className="app-backdrop" />
      <main className="app-frame" ref={appFrameRef}>
        <header className="topbar">
          <div className="topbar__slot topbar__slot--nav">
            <button
              type="button"
              className="topbar-action topbar-action--nav"
              onClick={handleTopbarBack}
              disabled={!showBackButton}
            >
              <span className="button-label">
                <ChevronLeftIcon aria-hidden="true" />
                <span>{topbarBackLabel}</span>
              </span>
            </button>
          </div>

          <button
            type="button"
            className="topbar__center-button"
            aria-label="Film Dev"
            onClick={handleSecretDebugTap}
          >
            <span className="topbar__center">
              <p className="topbar__eyebrow">{headerEyebrow}</p>
              <strong className="topbar__title">{headerTitle}</strong>
              {headerSubtitle ? (
                <span className="topbar__subtitle">{headerSubtitle}</span>
              ) : null}
            </span>
          </button>

          <div className="topbar__slot topbar__slot--tools">
            <button
              type="button"
              className="topbar-action topbar-action--theme"
              aria-label={quickThemeLabel}
              onClick={handleQuickThemeToggle}
            >
              <span className="button-label">
                <QuickThemeIcon aria-hidden="true" />
                <span>{quickThemeCompactLabel}</span>
              </span>
            </button>
          </div>
        </header>

        <div className="content-shell">
          <div
            key={`${screen}-${screenTransitionDirection}`}
            className={[
              "screen-stage",
              `screen-stage--${screenTransitionDirection}`,
              preferences.animationsEnabled ? "is-animated" : "is-static",
            ].join(" ")}
          >
            {screen === "recipes" ? (
              <RecipeBrowser
                recipes={recipes}
                selectedRecipeId={selectedRecipeId}
                onSelect={handleSelectRecipe}
              />
            ) : null}

            {screen === "setup" ? (
              <section className="stack">
                <SetupForm
                  recipe={selectedRecipe}
                  plan={draftPlan}
                  values={selectedDraft}
                  onChange={updateDraft}
                />
                <div className="action-row">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => transitionToScreen("recipes", "back")}
                  >
                    <span className="button-label">
                      <BookIcon aria-hidden="true" />
                      <span>Back to recipes</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => handleNavigate("plan")}
                  >
                    <span className="button-label">
                      <ClipboardIcon aria-hidden="true" />
                      <span>Review plan</span>
                    </span>
                  </button>
                </div>
                {showSetupWarningBanner ? (
                  <div
                    className="setup-warning-dock-spacer"
                    aria-hidden="true"
                  />
                ) : null}
              </section>
            ) : null}

            {screen === "plan" ? (
              <PlanReview
                recipe={selectedRecipe}
                plan={draftPlan}
                onBackToSetup={() => transitionToScreen("setup", "back")}
                onSavePreset={handleSavePreset}
                onStartSession={handleStartSession}
              />
            ) : null}

            {screen === "session" &&
            activePlan &&
            activeSession &&
            runtimeFrame ? (
              <SessionConsole
                recipe={selectedRecipe}
                plan={activePlan}
                state={activeSession}
                frame={runtimeFrame}
                onStart={() => {
                  logUiEvent("session_started_from_console");
                  setActiveSession((current) =>
                    current ? beginSessionState(current, Date.now()) : current,
                  );
                }}
                onPause={() => {
                  logUiEvent("session_paused_from_console");
                  setActiveSession((current) =>
                    current ? pauseSession(current, Date.now()) : current,
                  );
                }}
                onResume={() => {
                  logUiEvent("session_resumed_from_console");
                  setActiveSession((current) =>
                    current ? resumeSession(current, Date.now()) : current,
                  );
                }}
                onConfirmPhaseStart={() => {
                  const phaseLabel =
                    runtimeFrame.currentPhase?.label ?? "Next step";
                  logUiEvent("phase_wait_confirmed", {
                    phaseIndex: runtimeFrame.phaseIndex,
                    phaseLabel,
                    timerMode:
                      runtimeFrame.currentPhase?.timerMode ?? "countdown",
                  });
                  setActiveSession((current) =>
                    runtimeFrame.currentPhase?.timerMode === "manual" &&
                    runtimeFrame.currentPhase
                      ? current
                        ? completeManualPhase(
                            current,
                            Date.now(),
                            runtimeFrame.currentPhase.id,
                            phaseLabel,
                          )
                        : current
                      : current
                        ? confirmPhaseStart(current, Date.now(), phaseLabel)
                        : current,
                  );
                }}
                onConfirmRecovery={() => {
                  logUiEvent("session_recovery_confirmed");
                  setActiveSession((current) =>
                    current ? confirmRecovery(current, Date.now()) : current,
                  );
                }}
                onAbort={() => {
                  logUiEvent("session_aborted");
                  setActiveSession((current) =>
                    current ? abortSession(current, Date.now()) : current,
                  );
                }}
                onReset={handleResetSession}
              />
            ) : null}

            {screen === "mix" ? (
              <MixPanel
                workspace={mixWorkspace}
                onChange={setMixWorkspace}
                onEvent={logUiEvent}
              />
            ) : null}

            {screen === "saved" ? (
              <SavedPanel presets={presets} onLoadPreset={handleLoadPreset} />
            ) : null}

            {screen === "settings" ? (
              <SettingsPanel
                preferences={preferences}
                presets={presets}
                diagnostics={diagnostics}
                debugEntries={debugEntries}
                debugStats={debugStats}
                onSelectThemeMode={handleSetThemeMode}
                onToggleHandedness={handleToggleHandedness}
                onToggleAnimations={handleToggleAnimations}
                onToggleButtonSounds={handleToggleButtonSounds}
                onTogglePhaseConfirmation={handleTogglePhaseConfirmation}
                onToggleDiagnostics={handleToggleDiagnostics}
                onExportPresets={handleExportPresets}
                onExportAllLocalData={handleExportAllLocalData}
                onCopyDiagnostics={handleCopyDiagnostics}
                onDownloadDebugLogs={handleDownloadDebugLogs}
                onRefreshDebugLogs={() => void syncDebugState("manual-refresh")}
                onClearDebugLogs={() => void handleClearDebugLogs()}
                onRecordBreadcrumb={() => void handleRecordBreadcrumb()}
              />
            ) : null}

            {screen === "about" ? <AboutPanel /> : null}
          </div>

          {showAboutLink ? (
            <footer className="app-meta">
              <button
                type="button"
                className="app-meta__link"
                onClick={handleOpenAbout}
              >
                About this app
              </button>
            </footer>
          ) : null}
        </div>

        {showSetupWarningBanner ? (
          <section
            className="setup-warning-dock"
            aria-label="Setup issues"
            aria-live="polite"
          >
            <div className="setup-warning-dock__surface">
              <div className="setup-warning-dock__inner">
                <div className="setup-warning-dock__header">
                  <div className="panel-heading panel-heading--tight">
                    <h3>
                      <span className="title-with-icon title-with-icon--compact">
                        <WarningIcon aria-hidden="true" />
                        <span>Unsupported right now</span>
                      </span>
                    </h3>
                    <p>
                      This combination does not match the official source data
                      yet.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="chip-button setup-warning-dock__dismiss"
                    onClick={() => {
                      logUiEvent("setup_warning_ignored", {
                        blockingIssues: draftPlan.blockingIssues,
                      });
                      setSetupWarningIgnored(true);
                    }}
                  >
                    Ignore
                  </button>
                </div>
                <ul className="bullet-list setup-warning-dock__issues">
                  {draftPlan.blockingIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ) : null}

        {screen !== "session" ? (
          <nav className="bottom-nav">
            <div className="bottom-nav__inner">
              {navigationItems.map((item) => {
                const NavIcon = item.icon;

                return (
                  <button
                    key={item.screen}
                    type="button"
                    className={screen === item.screen ? "is-active" : ""}
                    onClick={() => handleNavigate(item.screen)}
                  >
                    <span className="nav-button__content">
                      <NavIcon aria-hidden="true" />
                      <span>{item.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        ) : null}

        {toast ? <div className="toast">{toast}</div> : null}
      </main>
    </div>
  );
}
