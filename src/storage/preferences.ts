import type {
  ActiveSessionState,
  AlertProfile,
  SessionPlan,
  ThemeMode
} from '../domain/types';
import {
  clampGlobalTimeMultiplier,
  defaultGlobalTimeMultiplier,
} from '../domain/timeScale';
import { logDebugEvent } from '../debug/logging';

const preferenceKey = 'film-dev/preferences/v1';
const activeSessionKey = 'film-dev/active-session/v1';

export interface PreferenceState {
  alertProfileId: string;
  themeMode: ThemeMode;
  leftHanded: boolean;
  animationsEnabled: boolean;
  buttonSoundsEnabled: boolean;
  speechPromptsEnabled: boolean;
  additionalSpeechPromptsEnabled: boolean;
  speechPromptRate: number;
  speechPromptVolume: number;
  sessionStartCountdownSec: number;
  phaseConfirmationEnabled: boolean;
  diagnosticsOpen: boolean;
  debugUnlocked: boolean;
  debugModeEnabled: boolean;
  globalTimeMultiplier: number;
  globalTimeAnchorRealMs: number;
  globalTimeAnchorAppMs: number;
}

interface LegacyPreferenceState {
  alertProfileId?: string;
  redSafeEnabled?: boolean;
  themeMode?: ThemeMode;
  leftHanded?: boolean;
  animationsEnabled?: boolean;
  buttonSoundsEnabled?: boolean;
  speechPromptsEnabled?: boolean;
  additionalSpeechPromptsEnabled?: boolean;
  speechPromptRate?: number;
  speechPromptVolume?: number;
  sessionStartCountdownSec?: number;
  phaseConfirmationEnabled?: boolean;
  diagnosticsOpen?: boolean;
  debugUnlocked?: boolean;
  debugModeEnabled?: boolean;
  globalTimeMultiplier?: number;
  globalTimeAnchorRealMs?: number;
  globalTimeAnchorAppMs?: number;
}

const defaultAlertProfileId = 'balanced';
const defaultThemeMode: ThemeMode = 'standard';
const defaultLeftHanded = false;
const defaultAnimationsEnabled = true;
const defaultButtonSoundsEnabled = true;
const defaultSpeechPromptsEnabled = true;
const defaultAdditionalSpeechPromptsEnabled = false;
const defaultSpeechPromptRate = 1.5;
const defaultSpeechPromptVolume = 1;
const defaultSessionStartCountdownSec = 3;
const defaultPhaseConfirmationEnabled = false;
const defaultDiagnosticsOpen = false;
const defaultDebugUnlocked = false;
const defaultDebugModeEnabled = false;

function createDefaultPreferences(nowMs = Date.now()): PreferenceState {
  return {
    alertProfileId: defaultAlertProfileId,
    themeMode: defaultThemeMode,
    leftHanded: defaultLeftHanded,
    animationsEnabled: defaultAnimationsEnabled,
    buttonSoundsEnabled: defaultButtonSoundsEnabled,
    speechPromptsEnabled: defaultSpeechPromptsEnabled,
    additionalSpeechPromptsEnabled: defaultAdditionalSpeechPromptsEnabled,
    speechPromptRate: defaultSpeechPromptRate,
    speechPromptVolume: defaultSpeechPromptVolume,
    sessionStartCountdownSec: defaultSessionStartCountdownSec,
    phaseConfirmationEnabled: defaultPhaseConfirmationEnabled,
    diagnosticsOpen: defaultDiagnosticsOpen,
    debugUnlocked: defaultDebugUnlocked,
    debugModeEnabled: defaultDebugModeEnabled,
    globalTimeMultiplier: defaultGlobalTimeMultiplier,
    globalTimeAnchorRealMs: nowMs,
    globalTimeAnchorAppMs: nowMs
  };
}

const supportedThemeModes = new Set<ThemeMode>([
  "standard",
  "daylight",
  "red_safe",
  "ultrared",
]);

function resolveStoredSessionStartCountdownSec(
  rawPreferences: LegacyPreferenceState,
) {
  const rawValue = rawPreferences.sessionStartCountdownSec;

  if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
    return defaultSessionStartCountdownSec;
  }

  return Math.min(10, Math.max(0, Math.round(rawValue)));
}

export function clampSpeechPromptRate(rawValue: number) {
  if (!Number.isFinite(rawValue)) {
    return defaultSpeechPromptRate;
  }

  return Math.min(3, Math.max(1, Math.round(rawValue * 4) / 4));
}

export function clampSpeechPromptVolume(rawValue: number) {
  if (!Number.isFinite(rawValue)) {
    return defaultSpeechPromptVolume;
  }

  return Math.min(1, Math.max(0, Math.round(rawValue * 100) / 100));
}

function resolveStoredGlobalTimeAnchorRealMs(
  rawPreferences: LegacyPreferenceState,
  fallbackNowMs: number,
) {
  const rawValue = rawPreferences.globalTimeAnchorRealMs;

  if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
    return fallbackNowMs;
  }

  return rawValue;
}

function resolveStoredGlobalTimeAnchorAppMs(
  rawPreferences: LegacyPreferenceState,
  fallbackAppMs: number,
) {
  const rawValue = rawPreferences.globalTimeAnchorAppMs;

  if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
    return fallbackAppMs;
  }

  return rawValue;
}

function resolveStoredThemeMode(rawPreferences: LegacyPreferenceState) {
  const rawThemeMode = rawPreferences.themeMode;

  if (rawThemeMode && supportedThemeModes.has(rawThemeMode)) {
    return rawThemeMode;
  }

  if (rawPreferences.redSafeEnabled === true) {
    return 'red_safe';
  }

  return defaultThemeMode;
}

export function loadPreferences() {
  const nowMs = Date.now();
  const defaultPreferences = createDefaultPreferences(nowMs);

  if (typeof localStorage === 'undefined') {
    return defaultPreferences;
  }

  const raw = localStorage.getItem(preferenceKey);

  if (!raw) {
    logDebugEvent({
      category: 'storage',
      event: 'preferences_loaded_default'
    });
    return defaultPreferences;
  }

  try {
    const parsed = JSON.parse(raw) as LegacyPreferenceState;
    const globalTimeAnchorRealMs = resolveStoredGlobalTimeAnchorRealMs(
      parsed,
      nowMs,
    );
    const globalTimeMultiplier = clampGlobalTimeMultiplier(
      parsed.globalTimeMultiplier ?? Number.NaN,
    );
    const preferences = {
      ...defaultPreferences,
      ...parsed,
      themeMode: resolveStoredThemeMode(parsed),
      speechPromptRate: clampSpeechPromptRate(parsed.speechPromptRate ?? NaN),
      speechPromptVolume: clampSpeechPromptVolume(
        parsed.speechPromptVolume ?? NaN,
      ),
      sessionStartCountdownSec: resolveStoredSessionStartCountdownSec(parsed),
      alertProfileId: parsed.alertProfileId ?? defaultAlertProfileId,
      leftHanded: parsed.leftHanded ?? defaultLeftHanded,
      animationsEnabled: parsed.animationsEnabled ?? defaultAnimationsEnabled,
      buttonSoundsEnabled:
        parsed.buttonSoundsEnabled ?? defaultButtonSoundsEnabled,
      speechPromptsEnabled:
        parsed.speechPromptsEnabled ?? defaultSpeechPromptsEnabled,
      additionalSpeechPromptsEnabled:
        parsed.additionalSpeechPromptsEnabled ??
        defaultAdditionalSpeechPromptsEnabled,
      phaseConfirmationEnabled:
        parsed.phaseConfirmationEnabled ?? defaultPhaseConfirmationEnabled,
      diagnosticsOpen: parsed.diagnosticsOpen ?? defaultDiagnosticsOpen,
      debugUnlocked: parsed.debugUnlocked ?? defaultDebugUnlocked,
      debugModeEnabled: parsed.debugModeEnabled ?? defaultDebugModeEnabled,
      globalTimeMultiplier,
      globalTimeAnchorRealMs,
      globalTimeAnchorAppMs: resolveStoredGlobalTimeAnchorAppMs(
        parsed,
        globalTimeAnchorRealMs,
      ),
    } satisfies PreferenceState;

    logDebugEvent({
      category: 'storage',
      event: 'preferences_loaded',
      detail: {
        themeMode: preferences.themeMode,
        leftHanded: preferences.leftHanded,
        animationsEnabled: preferences.animationsEnabled,
        buttonSoundsEnabled: preferences.buttonSoundsEnabled,
        speechPromptsEnabled: preferences.speechPromptsEnabled,
        additionalSpeechPromptsEnabled:
          preferences.additionalSpeechPromptsEnabled,
        speechPromptRate: preferences.speechPromptRate,
        speechPromptVolume: preferences.speechPromptVolume,
        sessionStartCountdownSec: preferences.sessionStartCountdownSec,
        phaseConfirmationEnabled: preferences.phaseConfirmationEnabled,
        diagnosticsOpen: preferences.diagnosticsOpen,
        debugUnlocked: preferences.debugUnlocked,
        debugModeEnabled: preferences.debugModeEnabled,
        globalTimeMultiplier: preferences.globalTimeMultiplier
      }
    });

    return preferences;
  } catch {
    logDebugEvent({
      level: 'warn',
      category: 'storage',
      event: 'preferences_parse_failed'
    });
    return defaultPreferences;
  }
}

export function savePreferences(preferences: PreferenceState) {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(preferenceKey, JSON.stringify(preferences));
  logDebugEvent({
    category: 'storage',
    event: 'preferences_saved',
    detail: {
      themeMode: preferences.themeMode,
      leftHanded: preferences.leftHanded,
      animationsEnabled: preferences.animationsEnabled,
      buttonSoundsEnabled: preferences.buttonSoundsEnabled,
      speechPromptsEnabled: preferences.speechPromptsEnabled,
      additionalSpeechPromptsEnabled:
        preferences.additionalSpeechPromptsEnabled,
      speechPromptRate: preferences.speechPromptRate,
      speechPromptVolume: preferences.speechPromptVolume,
      sessionStartCountdownSec: preferences.sessionStartCountdownSec,
      phaseConfirmationEnabled: preferences.phaseConfirmationEnabled,
      diagnosticsOpen: preferences.diagnosticsOpen,
      debugUnlocked: preferences.debugUnlocked,
      debugModeEnabled: preferences.debugModeEnabled,
      globalTimeMultiplier: preferences.globalTimeMultiplier
    }
  });
}

export function loadActiveSessionSnapshot() {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(activeSessionKey);

  if (!raw) {
    logDebugEvent({
      category: 'storage',
      event: 'active_session_snapshot_missing'
    });
    return null;
  }

  try {
    const snapshot = JSON.parse(raw) as {
      plan: SessionPlan;
      state: ActiveSessionState;
    };

    logDebugEvent({
      category: 'storage',
      event: 'active_session_snapshot_loaded',
      detail: {
        planId: snapshot.plan.id,
        recipeId: snapshot.plan.recipeId,
        sessionId: snapshot.state.sessionId,
        status: snapshot.state.status
      },
      recipeId: snapshot.plan.recipeId,
      sessionId: snapshot.state.sessionId
    });

    return snapshot;
  } catch {
    logDebugEvent({
      level: 'warn',
      category: 'storage',
      event: 'active_session_snapshot_parse_failed'
    });
    return null;
  }
}

export function saveActiveSessionSnapshot(plan: SessionPlan, state: ActiveSessionState) {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(activeSessionKey, JSON.stringify({ plan, state }));
  logDebugEvent({
    category: 'storage',
    event: 'active_session_snapshot_saved',
    detail: {
      planId: plan.id,
      recipeId: plan.recipeId,
      sessionId: state.sessionId,
      status: state.status
    },
    recipeId: plan.recipeId,
    sessionId: state.sessionId
  });
}

export function clearActiveSessionSnapshot() {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.removeItem(activeSessionKey);
  logDebugEvent({
    category: 'storage',
    event: 'active_session_snapshot_cleared'
  });
}

export function resolveAlertProfile(
  alertProfiles: AlertProfile[],
  preferences: PreferenceState,
) {
  return (
    alertProfiles.find((profile) => profile.id === preferences.alertProfileId) ??
    alertProfiles[0]
  );
}
