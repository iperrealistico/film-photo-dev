import { formatDateTime, formatDuration } from '../domain/format';
import type {
  ActiveSessionState,
  ChemistryBatch,
  RecipeDefinition,
  RuntimeFrame,
  SessionPlan
} from '../domain/types';

interface SessionConsoleProps {
  recipe: RecipeDefinition;
  plan: SessionPlan;
  state: ActiveSessionState;
  frame: RuntimeFrame;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onConfirmRecovery: () => void;
  onAbort: () => void;
  onReset: () => void;
  onLogBatch: () => void;
  lastLoggedBatch?: ChemistryBatch;
}

export function SessionConsole({
  recipe,
  plan,
  state,
  frame,
  onStart,
  onPause,
  onResume,
  onConfirmRecovery,
  onAbort,
  onReset,
  onLogBatch,
  lastLoggedBatch
}: SessionConsoleProps) {
  const upcomingPhases = frame.currentPhase
    ? plan.phaseList.slice(frame.phaseIndex + 1, frame.phaseIndex + 4)
    : plan.phaseList.slice(-3);

  const isCompletionState =
    state.status === 'completed' || state.status === 'aborted' || frame.completed;

  return (
    <section className="stack session-layout">
      <div className="session-banner">
        <div>
          <p className="eyebrow">Darkroom mode</p>
          <strong>{recipe.developerLabel}</strong>
        </div>
        <div className="session-banner__meta">
          <span>{plan.sourceSummary}</span>
          <strong>{formatDuration(plan.totalDurationSec)}</strong>
        </div>
      </div>

      {state.status === 'recovering' ? (
        <section className="panel recovery-panel">
          <p className="eyebrow">Recovery</p>
          <h2>Session recovered from local storage</h2>
          <p>{state.recoveryNote}</p>
          <p>
            Timing uncertainty: {Math.round(state.uncertaintyMs / 1000)} sec. The
            app is being honest about what it can infer.
          </p>
          <div className="action-row">
            <button type="button" className="secondary-button" onClick={onAbort}>
              Stop session
            </button>
            <button type="button" className="primary-button" onClick={onConfirmRecovery}>
              Continue with recovery
            </button>
          </div>
        </section>
      ) : null}

      <section className="session-hero">
        <div className="session-hero__phase">
          <span className={`tone-chip tone-chip--${recipe.accentTone}`}>
            {isCompletionState ? 'Completed' : frame.currentPhase?.label ?? 'Ready'}
          </span>
          <h1>
            {isCompletionState
              ? state.status === 'aborted'
                ? 'Session stopped'
                : 'Session complete'
              : formatDuration(frame.remainingInPhaseSec)}
          </h1>
          <p>
            {isCompletionState
              ? state.status === 'aborted'
                ? 'The session was stopped. Reset cleanly before starting another run.'
                : 'Stay here, review what happened, and log the chemistry if you want.'
              : frame.currentPhase?.detail}
          </p>
        </div>
        <div className="session-hero__cue">
          <span>Next cue</span>
          <strong>
            {isCompletionState
              ? 'None'
              : frame.nextCue
                ? `${frame.nextCue.label} in ${frame.nextCueInSec ?? 0}s`
                : 'No more cues in this phase'}
          </strong>
          {!isCompletionState ? (
            <p>
              Phase {frame.phaseIndex + 1} of {plan.phaseList.length} · elapsed{' '}
              {formatDuration(frame.totalElapsedSec)}
            </p>
          ) : (
            <p>Created {formatDateTime(plan.generatedAt)}</p>
          )}
        </div>
      </section>

      {!isCompletionState ? (
        <div className="runtime-controls">
          {state.status === 'ready' ? (
            <button type="button" className="primary-button runtime-button" onClick={onStart}>
              Start timer
            </button>
          ) : state.status === 'paused' ? (
            <button type="button" className="primary-button runtime-button" onClick={onResume}>
              Resume
            </button>
          ) : (
            <button type="button" className="primary-button runtime-button" onClick={onPause}>
              Pause
            </button>
          )}
          <button type="button" className="secondary-button runtime-button" onClick={onAbort}>
            Hold to stop later
          </button>
        </div>
      ) : (
        <div className="action-row">
          <button type="button" className="secondary-button" onClick={onReset}>
            Back to recipes
          </button>
          {state.status !== 'aborted' ? (
            <button type="button" className="primary-button" onClick={onLogBatch}>
              Log chemistry batch
            </button>
          ) : null}
        </div>
      )}

      <div className="plan-grid">
        <section className="panel stack">
          <div className="panel-heading">
            <h3>Phase stack</h3>
            <p>Only the current and next few phases stay visible during runtime.</p>
          </div>
          <div className="stack compact-stack">
            {frame.currentPhase ? (
              <div className="phase-pill is-current">
                <strong>{frame.currentPhase.label}</strong>
                <span>{formatDuration(frame.remainingInPhaseSec)} left</span>
              </div>
            ) : null}
            {upcomingPhases.map((phase) => (
              <div key={phase.id} className="phase-pill">
                <strong>{phase.label}</strong>
                <span>{formatDuration(phase.durationSec)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel stack">
          <div className="panel-heading">
            <h3>Event trail</h3>
            <p>A local event log makes recovery and debugging less mysterious.</p>
          </div>
          <div className="event-log">
            {state.eventLog.slice(-6).map((event) => (
              <div key={event.id} className="event-row">
                <strong>{event.type.replaceAll('_', ' ')}</strong>
                <span>{formatDateTime(event.at)}</span>
                <p>{event.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {lastLoggedBatch ? (
        <section className="panel stack">
          <div className="panel-heading">
            <h3>Latest chemistry batch</h3>
            <p>Batch tracking is already live in the first build.</p>
          </div>
          <div className="fact-list">
            <div className="fact-row">
              <span>{lastLoggedBatch.chemistryLabel}</span>
              <strong>{lastLoggedBatch.estimatedRemainingCapacity}</strong>
            </div>
            <div className="fact-row">
              <span>Last used</span>
              <strong>{formatDateTime(lastLoggedBatch.lastUsedAt)}</strong>
            </div>
          </div>
        </section>
      ) : null}
    </section>
  );
}
