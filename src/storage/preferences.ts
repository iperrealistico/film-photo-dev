import type {
  ActiveSessionState,
  AlertProfile,
  SessionPlan,
  ThemeMode
} from '../domain/types';
import { logDebugEvent } from '../debug/logging';

const preferenceKey = 'film-dev/preferences/v1';
const activeSessionKey = 'film-dev/active-session/v1';

export interface PreferenceState {
  alertProfileId: string;
  themeMode: ThemeMode;
  leftHanded: boolean;
  animationsEnabled: boolean;
  buttonSoundsEnabled: boolean;
  phaseConfirmationEnabled: boolean;
  diagnosticsOpen: boolean;
  debugUnlocked: boolean;
}

interface LegacyPreferenceState {
  alertProfileId?: string;
  redSafeEnabled?: boolean;
  themeMode?: ThemeMode;
  leftHanded?: boolean;
  animationsEnabled?: boolean;
  buttonSoundsEnabled?: boolean;
  phaseConfirmationEnabled?: boolean;
  diagnosticsOpen?: boolean;
  debugUnlocked?: boolean;
}

const defaultPreferences: PreferenceState = {
  alertProfileId: 'balanced',
  themeMode: 'standard',
  leftHanded: false,
  animationsEnabled: true,
  buttonSoundsEnabled: true,
  phaseConfirmationEnabled: false,
  diagnosticsOpen: false,
  debugUnlocked: false
};

function resolveStoredThemeMode(rawPreferences: LegacyPreferenceState) {
  if (rawPreferences.themeMode) {
    return rawPreferences.themeMode;
  }

  if (rawPreferences.redSafeEnabled === true) {
    return 'red_safe';
  }

  return defaultPreferences.themeMode;
}

export function loadPreferences() {
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
    const preferences = {
      ...defaultPreferences,
      ...parsed,
      themeMode: resolveStoredThemeMode(parsed)
    } satisfies PreferenceState;

    logDebugEvent({
      category: 'storage',
      event: 'preferences_loaded',
      detail: {
        themeMode: preferences.themeMode,
        leftHanded: preferences.leftHanded,
        animationsEnabled: preferences.animationsEnabled,
        buttonSoundsEnabled: preferences.buttonSoundsEnabled,
        phaseConfirmationEnabled: preferences.phaseConfirmationEnabled,
        diagnosticsOpen: preferences.diagnosticsOpen,
        debugUnlocked: preferences.debugUnlocked
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
      phaseConfirmationEnabled: preferences.phaseConfirmationEnabled,
      diagnosticsOpen: preferences.diagnosticsOpen,
      debugUnlocked: preferences.debugUnlocked
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
