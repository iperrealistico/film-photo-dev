import { formatDateTime } from "../domain/format";
import type {
  DebugLogEntry,
  DebugLogStats,
  DiagnosticBundle,
  SavedPreset,
  ThemeMode,
} from "../domain/types";
import type { PreferenceState } from "../storage/preferences";
import {
  BookmarkIcon,
  BugIcon,
  ClipboardIcon,
  DownloadIcon,
  MoonIcon,
  PauseIcon,
  RefreshIcon,
  SpeakerIcon,
  SparkIcon,
  ShieldIcon,
  SlidersIcon,
  SunIcon,
  TrashIcon,
  WorkflowIcon,
} from "./icons";

interface SavedPanelProps {
  presets: SavedPreset[];
  onLoadPreset: (presetId: string) => void;
}

export function SavedPanel({ presets, onLoadPreset }: SavedPanelProps) {
  return (
    <section className="stack">
      <div className="section-heading">
        <p className="eyebrow">Saved</p>
        <h2>
          <span className="title-with-icon title-with-icon--large">
            <BookmarkIcon aria-hidden="true" />
            <span>Saved presets</span>
          </span>
        </h2>
        <p>Keep the setups you trust so repeat sessions are faster.</p>
      </div>
      <section className="panel stack">
        {presets.length === 0 ? (
          <p className="soft-copy">
            No presets yet. Save one from the review screen.
          </p>
        ) : (
          presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="library-row"
              onClick={() => onLoadPreset(preset.id)}
            >
              <div className="library-row__main">
                <span className="surface-icon surface-icon--row">
                  <BookmarkIcon aria-hidden="true" />
                </span>
                <div className="library-row__content">
                  <strong>{preset.name}</strong>
                  <p>{preset.recipeName}</p>
                </div>
              </div>
              <span>{formatDateTime(preset.updatedAt)}</span>
            </button>
          ))
        )}
      </section>
    </section>
  );
}

interface SettingsPanelProps {
  preferences: PreferenceState;
  presets: SavedPreset[];
  debugEntries: DebugLogEntry[];
  debugStats: DebugLogStats | null;
  onSelectThemeMode: (mode: ThemeMode) => void;
  onToggleHandedness: () => void;
  onToggleAnimations: () => void;
  onToggleButtonSounds: () => void;
  onTogglePhaseConfirmation: () => void;
  onToggleDiagnostics: () => void;
  onExportPresets: () => void;
  onExportAllLocalData: () => void;
  diagnostics: DiagnosticBundle;
  onCopyDiagnostics: () => void;
  onDownloadDebugLogs: () => void;
  onRefreshDebugLogs: () => void;
  onClearDebugLogs: () => void;
  onRecordBreadcrumb: () => void;
}

export function SettingsPanel({
  preferences,
  presets,
  debugEntries,
  debugStats,
  onSelectThemeMode,
  onToggleHandedness,
  onToggleAnimations,
  onToggleButtonSounds,
  onTogglePhaseConfirmation,
  onToggleDiagnostics,
  onExportPresets,
  onExportAllLocalData,
  diagnostics,
  onCopyDiagnostics,
  onDownloadDebugLogs,
  onRefreshDebugLogs,
  onClearDebugLogs,
  onRecordBreadcrumb,
}: SettingsPanelProps) {
  return (
    <section className="stack">
      <div className="section-heading">
        <p className="eyebrow">Settings</p>
        <h2>
          <span className="title-with-icon title-with-icon--large">
            <SlidersIcon aria-hidden="true" />
            <span>Darkroom preferences</span>
          </span>
        </h2>
        <p>
          Adjust light mode, interaction feedback, layout, exports, and hidden
          diagnostics.
        </p>
      </div>

      <section className="panel stack">
        <div className="panel-heading">
          <h3>
            <span className="title-with-icon">
              <MoonIcon aria-hidden="true" />
              <span>Light mode</span>
            </span>
          </h3>
          <p>
            White light is the default. Reduced light softens the shell, and Red
            safe keeps it fully red-first for darkroom work.
          </p>
        </div>
        <div
          className="theme-mode-grid"
          role="group"
          aria-label="Darkroom light mode"
        >
          <button
            type="button"
            className={`theme-mode-button ${preferences.themeMode === "standard" ? "is-active" : ""}`}
            aria-pressed={preferences.themeMode === "standard"}
            onClick={() => onSelectThemeMode("standard")}
          >
            <span className="button-label">
              <SunIcon aria-hidden="true" />
              <span>Standard</span>
            </span>
            <strong>White light</strong>
          </button>
          <button
            type="button"
            className={`theme-mode-button ${preferences.themeMode === "red_safe" ? "is-active" : ""}`}
            aria-pressed={preferences.themeMode === "red_safe"}
            onClick={() => onSelectThemeMode("red_safe")}
          >
            <span className="button-label">
              <MoonIcon aria-hidden="true" />
              <span>Reduced</span>
            </span>
            <strong>Reduced light</strong>
          </button>
          <button
            type="button"
            className={`theme-mode-button ${preferences.themeMode === "ultrared" ? "is-active" : ""}`}
            aria-pressed={preferences.themeMode === "ultrared"}
            onClick={() => onSelectThemeMode("ultrared")}
          >
            <span className="button-label">
              <ShieldIcon aria-hidden="true" />
              <span>Darkroom</span>
            </span>
            <strong>Red safe</strong>
          </button>
        </div>
      </section>

      <section className="panel stack">
        <div className="panel-heading">
          <h3>
            <span className="title-with-icon">
              <DownloadIcon aria-hidden="true" />
              <span>Exports</span>
            </span>
          </h3>
          <p>Download your presets or the full local dataset.</p>
        </div>
        <div className="fact-list">
          <div className="fact-row">
            <span>Saved presets</span>
            <strong>{presets.length}</strong>
          </div>
        </div>
        <div className="debug-toolbar">
          <button
            type="button"
            className="secondary-button"
            onClick={onExportPresets}
          >
            <span className="button-label">
              <BookmarkIcon aria-hidden="true" />
              <span>Export presets</span>
            </span>
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={onExportAllLocalData}
          >
            <span className="button-label">
              <DownloadIcon aria-hidden="true" />
              <span>Export all local data</span>
            </span>
          </button>
        </div>
      </section>

      <section className="panel stack">
        <div className="panel-heading">
          <h3>
            <span className="title-with-icon">
              <SparkIcon aria-hidden="true" />
              <span>Interaction</span>
            </span>
          </h3>
          <p>
            Choose how much motion, feedback, and step-by-step control the app
            uses in the darkroom.
          </p>
        </div>
        <button
          type="button"
          className="toggle-button"
          onClick={onToggleAnimations}
        >
          <span className="button-label">
            <SparkIcon aria-hidden="true" />
            <span>Screen animations</span>
          </span>
          <strong>{preferences.animationsEnabled ? "On" : "Off"}</strong>
        </button>
        <button
          type="button"
          className="toggle-button"
          onClick={onToggleButtonSounds}
        >
          <span className="button-label">
            <SpeakerIcon aria-hidden="true" />
            <span>Button sounds</span>
          </span>
          <strong>{preferences.buttonSoundsEnabled ? "On" : "Off"}</strong>
        </button>
        <button
          type="button"
          className="toggle-button"
          onClick={onTogglePhaseConfirmation}
        >
          <span className="button-label">
            <PauseIcon aria-hidden="true" />
            <span>Pause between steps</span>
          </span>
          <strong>{preferences.phaseConfirmationEnabled ? "On" : "Off"}</strong>
        </button>
        <button
          type="button"
          className="toggle-button"
          onClick={onToggleHandedness}
        >
          <span className="button-label">
            <WorkflowIcon aria-hidden="true" />
            <span>Control layout</span>
          </span>
          <strong>
            {preferences.leftHanded ? "Left-handed" : "Right-handed"}
          </strong>
        </button>
        {preferences.debugUnlocked ? (
          <button
            type="button"
            className="toggle-button"
            onClick={onToggleDiagnostics}
          >
            <span className="button-label">
              <BugIcon aria-hidden="true" />
              <span>Diagnostics panel</span>
            </span>
            <strong>{preferences.diagnosticsOpen ? "Shown" : "Hidden"}</strong>
          </button>
        ) : null}
      </section>

      {preferences.debugUnlocked ? (
        <section className="panel stack">
          <div className="panel-heading">
            <h3>
              <span className="title-with-icon">
                <BugIcon aria-hidden="true" />
                <span>Advanced diagnostics</span>
              </span>
            </h3>
            <p>
              These tools stay hidden until unlocked so the normal darkroom UI
              can stay simple.
            </p>
          </div>
          <div className="debug-toolbar">
            <button
              type="button"
              className="secondary-button"
              onClick={onRefreshDebugLogs}
            >
              <span className="button-label">
                <RefreshIcon aria-hidden="true" />
                <span>Refresh log</span>
              </span>
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onRecordBreadcrumb}
            >
              <span className="button-label">
                <ClipboardIcon aria-hidden="true" />
                <span>Add breadcrumb</span>
              </span>
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onDownloadDebugLogs}
            >
              <span className="button-label">
                <DownloadIcon aria-hidden="true" />
                <span>Download log file</span>
              </span>
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onClearDebugLogs}
            >
              <span className="button-label">
                <TrashIcon aria-hidden="true" />
                <span>Clear log</span>
              </span>
            </button>
          </div>
          {debugStats ? (
            <div className="fact-list">
              <div className="fact-row">
                <span>Stored entries</span>
                <strong>{debugStats.entryCount}</strong>
              </div>
              <div className="fact-row">
                <span>Kept for</span>
                <strong>
                  {Math.round(debugStats.maxAgeMs / (1000 * 60 * 60 * 24))} days
                  / {debugStats.maxEntries} max
                </strong>
              </div>
              <div className="fact-row">
                <span>Last cleanup</span>
                <strong>
                  {debugStats.lastPrunedAt
                    ? formatDateTime(debugStats.lastPrunedAt)
                    : "Not yet"}
                </strong>
              </div>
            </div>
          ) : null}
          <div className="debug-log-list">
            {debugEntries.slice(0, 24).map((entry) => (
              <article key={entry.id} className="debug-log-row">
                <div className="debug-log-row__topline">
                  <strong>
                    {entry.category} · {entry.event}
                  </strong>
                  <span>{formatDateTime(entry.createdAt)}</span>
                </div>
                <p>{entry.level.toUpperCase()}</p>
                <pre className="debug-log-detail">
                  {entry.detail
                    ? JSON.stringify(entry.detail, null, 2)
                    : "No detail"}
                </pre>
              </article>
            ))}
            {debugEntries.length === 0 ? (
              <p className="soft-copy">No hidden log entries right now.</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {preferences.debugUnlocked && preferences.diagnosticsOpen ? (
        <section className="panel stack">
          <div className="panel-heading">
            <h3>
              <span className="title-with-icon">
                <ClipboardIcon aria-hidden="true" />
                <span>Diagnostics bundle</span>
              </span>
            </h3>
            <p>This is the local snapshot used for troubleshooting.</p>
          </div>
          <pre className="diagnostic-block">
            {JSON.stringify(diagnostics, null, 2)}
          </pre>
          <div className="debug-toolbar">
            <button
              type="button"
              className="secondary-button"
              onClick={onCopyDiagnostics}
            >
              <span className="button-label">
                <ClipboardIcon aria-hidden="true" />
                <span>Copy diagnostics</span>
              </span>
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onDownloadDebugLogs}
            >
              <span className="button-label">
                <DownloadIcon aria-hidden="true" />
                <span>Download debug bundle</span>
              </span>
            </button>
          </div>
        </section>
      ) : null}
    </section>
  );
}
