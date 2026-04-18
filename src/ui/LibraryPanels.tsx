import { formatDateTime } from '../domain/format';
import type {
  ChemistryBatch,
  DebugLogEntry,
  DebugLogStats,
  DiagnosticBundle,
  SavedPreset
} from '../domain/types';
import type { PreferenceState } from '../storage/preferences';

interface SavedPanelProps {
  presets: SavedPreset[];
  onLoadPreset: (presetId: string) => void;
}

export function SavedPanel({ presets, onLoadPreset }: SavedPanelProps) {
  return (
    <section className="stack">
      <div className="section-heading">
        <p className="eyebrow">Saved</p>
        <h2>Presets and repeatable workflows</h2>
        <p>Keep the combinations you trust so setup gets shorter every time.</p>
      </div>
      <section className="panel stack">
        {presets.length === 0 ? (
          <p className="soft-copy">No presets yet. Save one from the plan review screen.</p>
        ) : (
          presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="library-row"
              onClick={() => onLoadPreset(preset.id)}
            >
              <div>
                <strong>{preset.name}</strong>
                <p>{preset.recipeName}</p>
              </div>
              <span>{formatDateTime(preset.updatedAt)}</span>
            </button>
          ))
        )}
      </section>
    </section>
  );
}

interface ChemistryPanelProps {
  batches: ChemistryBatch[];
}

export function ChemistryPanel({ batches }: ChemistryPanelProps) {
  return (
    <section className="stack">
      <div className="section-heading">
        <p className="eyebrow">Chemistry</p>
        <h2>Local batch history</h2>
        <p>Track what was mixed, when it was last used, and how much life it still has.</p>
      </div>
      <section className="panel stack">
        {batches.length === 0 ? (
          <p className="soft-copy">No batches logged yet. Complete a session and log the chemistry from the summary view.</p>
        ) : (
          batches.map((batch) => (
            <div key={batch.id} className="library-row is-static">
              <div>
                <strong>{batch.chemistryLabel}</strong>
                <p>{batch.estimatedRemainingCapacity}</p>
              </div>
              <span>{formatDateTime(batch.lastUsedAt)}</span>
            </div>
          ))
        )}
      </section>
    </section>
  );
}

interface SettingsPanelProps {
  preferences: PreferenceState;
  debugEntries: DebugLogEntry[];
  debugStats: DebugLogStats | null;
  onToggleRedSafe: () => void;
  onToggleHandedness: () => void;
  onToggleDiagnostics: () => void;
  diagnostics: DiagnosticBundle;
  onCopyDiagnostics: () => void;
  onDownloadDebugLogs: () => void;
  onRefreshDebugLogs: () => void;
  onClearDebugLogs: () => void;
  onRecordBreadcrumb: () => void;
}

export function SettingsPanel({
  preferences,
  debugEntries,
  debugStats,
  onToggleRedSafe,
  onToggleHandedness,
  onToggleDiagnostics,
  diagnostics,
  onCopyDiagnostics,
  onDownloadDebugLogs,
  onRefreshDebugLogs,
  onClearDebugLogs,
  onRecordBreadcrumb
}: SettingsPanelProps) {
  return (
    <section className="stack">
      <div className="section-heading">
        <p className="eyebrow">Settings</p>
        <h2>Darkroom defaults and diagnostics</h2>
        <p>Keep runtime settings close, but separate from the chemistry logic.</p>
      </div>

      <section className="panel stack">
        <button type="button" className="toggle-button" onClick={onToggleRedSafe}>
          <span>Red-safe mode</span>
          <strong>{preferences.redSafeEnabled ? 'On' : 'Off'}</strong>
        </button>
        <button type="button" className="toggle-button" onClick={onToggleHandedness}>
          <span>Thumb layout</span>
          <strong>{preferences.leftHanded ? 'Left-handed' : 'Right-handed'}</strong>
        </button>
        {preferences.debugUnlocked ? (
          <button type="button" className="toggle-button" onClick={onToggleDiagnostics}>
            <span>Diagnostics panel</span>
            <strong>{preferences.diagnosticsOpen ? 'Visible' : 'Hidden'}</strong>
          </button>
        ) : null}
      </section>

      {preferences.debugUnlocked ? (
        <section className="panel stack">
          <div className="panel-heading">
            <h3>Hidden debug tools</h3>
            <p>
              These tools stay tucked away until unlocked so the normal runtime UI
              stays clean for actual darkroom use.
            </p>
          </div>
          <div className="debug-toolbar">
            <button type="button" className="secondary-button" onClick={onRefreshDebugLogs}>
              Refresh log
            </button>
            <button type="button" className="secondary-button" onClick={onRecordBreadcrumb}>
              Record breadcrumb
            </button>
            <button type="button" className="secondary-button" onClick={onDownloadDebugLogs}>
              Download file
            </button>
            <button type="button" className="secondary-button" onClick={onClearDebugLogs}>
              Clear log
            </button>
          </div>
          {debugStats ? (
            <div className="fact-list">
              <div className="fact-row">
                <span>Stored entries</span>
                <strong>{debugStats.entryCount}</strong>
              </div>
              <div className="fact-row">
                <span>Retention</span>
                <strong>
                  {Math.round(debugStats.maxAgeMs / (1000 * 60 * 60 * 24))} days /{' '}
                  {debugStats.maxEntries} max
                </strong>
              </div>
              <div className="fact-row">
                <span>Last pruned</span>
                <strong>{debugStats.lastPrunedAt ? formatDateTime(debugStats.lastPrunedAt) : 'Not yet'}</strong>
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
                  {entry.detail ? JSON.stringify(entry.detail, null, 2) : 'No detail'}
                </pre>
              </article>
            ))}
            {debugEntries.length === 0 ? (
              <p className="soft-copy">The hidden log is empty right now.</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {preferences.debugUnlocked && preferences.diagnosticsOpen ? (
        <section className="panel stack">
          <div className="panel-heading">
            <h3>Diagnostics</h3>
            <p>Local debugging stays in the product because there is no backend to lean on.</p>
          </div>
          <pre className="diagnostic-block">
            {JSON.stringify(diagnostics, null, 2)}
          </pre>
          <div className="debug-toolbar">
            <button type="button" className="secondary-button" onClick={onCopyDiagnostics}>
              Copy diagnostics JSON
            </button>
            <button type="button" className="secondary-button" onClick={onDownloadDebugLogs}>
              Download debug bundle
            </button>
          </div>
        </section>
      ) : null}
    </section>
  );
}
