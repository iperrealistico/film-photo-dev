import { formatDateTime, formatDuration } from '../domain/format';
import type {
  ActiveSessionState,
  ChemistryBatch,
  RecipeDefinition,
  RuntimeFrame,
  SessionPlan
} from '../domain/types';
import {
  BottleIcon,
  ClockIcon,
  LogIcon,
  PauseIcon,
  PlayIcon,
  RefreshIcon,
  StopIcon,
  WarningIcon,
  WorkflowIcon
} from './icons';

interface SessionConsoleProps {
  recipe: RecipeDefinition;
  plan: SessionPlan;
  state: ActiveSessionState;
  frame: RuntimeFrame;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onConfirmPhaseStart: () => void;
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
  onConfirmPhaseStart,
  onConfirmRecovery,
  onAbort,
  onReset,
  onLogBatch,
  lastLoggedBatch
}: SessionConsoleProps) {
  const upcomingPhases = frame.currentPhase
    ? plan.phaseList.slice(frame.phaseIndex + 1, frame.phaseIndex + 4)
    : plan.phaseList.slice(-3);
  const isAwaitingPhaseStart = state.status === 'awaiting_phase_start';
  const nextPhaseLabel = frame.currentPhase?.label ?? 'Next step';

  const isCompletionState =
    state.status === 'completed' || state.status === 'aborted' || frame.completed;

  return (
    <section className="stack session-layout">
      <div className="session-banner">
        <div className="session-banner__summary">
          <p className="eyebrow">
            <span className="title-with-icon title-with-icon--compact">
              <ClockIcon aria-hidden="true" />
              <span>Darkroom mode</span>
            </span>
          </p>
          <strong className="session-banner__title">{recipe.developerLabel}</strong>
        </div>
        <div className="session-banner__meta">
          <span className="session-banner__source">{plan.sourceSummary}</span>
          <strong className="session-banner__duration">{formatDuration(plan.totalDurationSec)}</strong>
        </div>
      </div>

      {state.status === 'recovering' ? (
        <section className="panel recovery-panel">
          <p className="eyebrow">Recovery</p>
          <h2>
            <span className="title-with-icon">
              <WarningIcon aria-hidden="true" />
              <span>Recovered session</span>
            </span>
          </h2>
          <p>{state.recoveryNote}</p>
          <p>
            Timing uncertainty: {Math.round(state.uncertaintyMs / 1000)} sec. Check
            the timer before you continue.
          </p>
          <div className="action-row">
            <button type="button" className="secondary-button" onClick={onAbort}>
              <span className="button-label">
                <StopIcon aria-hidden="true" />
                <span>End session</span>
              </span>
            </button>
            <button type="button" className="primary-button" onClick={onConfirmRecovery}>
              <span className="button-label">
                <PlayIcon aria-hidden="true" />
                <span>Continue</span>
              </span>
            </button>
          </div>
        </section>
      ) : null}

      <section className="session-hero">
        <div className="session-hero__phase">
          <span className={`tone-chip tone-chip--${recipe.accentTone}`}>
            {isCompletionState
              ? 'Completed'
              : isAwaitingPhaseStart
                ? 'Ready check'
                : frame.currentPhase?.label ?? 'Ready'}
          </span>
          <h1>
            {isCompletionState
              ? state.status === 'aborted'
                ? 'Session stopped'
                : 'Session complete'
              : isAwaitingPhaseStart
                ? `Ready for ${nextPhaseLabel}?`
                : formatDuration(frame.remainingInPhaseSec)}
          </h1>
          <p>
            {isCompletionState
              ? state.status === 'aborted'
                ? 'This session ended early. Reset before you begin another run.'
                : 'Review the summary and save the chemistry log if you want.'
              : isAwaitingPhaseStart
                ? 'The previous phase has finished. Start the next timer only when the tank and chemistry are ready.'
                : frame.currentPhase?.detail}
          </p>
        </div>
        <div className="session-hero__cue">
          <span>Up next</span>
          <strong>
            {isCompletionState
              ? 'None'
              : isAwaitingPhaseStart
                ? `${nextPhaseLabel} is waiting to begin`
              : frame.nextCue
                ? `${frame.nextCue.label} in ${frame.nextCueInSec ?? 0}s`
                : 'No more cues in this step'}
          </strong>
          {!isCompletionState ? (
            <p>
              {isAwaitingPhaseStart
                ? `Step ${frame.phaseIndex + 1} of ${plan.phaseList.length} · timer paused until you confirm`
                : `Step ${frame.phaseIndex + 1} of ${plan.phaseList.length} · elapsed ${formatDuration(frame.totalElapsedSec)}`}
            </p>
          ) : (
            <p>Planned {formatDateTime(plan.generatedAt)}</p>
          )}
        </div>
      </section>

      {isAwaitingPhaseStart ? (
        <section className="panel stack runtime-gate-panel">
          <p className="eyebrow">Next step paused</p>
          <h2 className="runtime-gate-panel__title">{nextPhaseLabel} is ready when you are.</h2>
          <p>
            Tap the large button only when you want the next countdown to begin for
            real.
          </p>
          <div className="action-row">
            <button
              type="button"
              className="primary-button runtime-button runtime-button--gate"
              onClick={onConfirmPhaseStart}
            >
              <span className="button-label">
                <PlayIcon aria-hidden="true" />
                <span>Begin next step</span>
              </span>
            </button>
            <button type="button" className="secondary-button runtime-button" onClick={onAbort}>
              <span className="button-label">
                <StopIcon aria-hidden="true" />
                <span>End session</span>
              </span>
            </button>
          </div>
        </section>
      ) : null}

      {!isCompletionState ? (
        !isAwaitingPhaseStart ? (
          <div className="runtime-controls">
            {state.status === 'ready' ? (
              <button type="button" className="primary-button runtime-button" onClick={onStart}>
                <span className="button-label">
                  <PlayIcon aria-hidden="true" />
                  <span>Start timer</span>
                </span>
              </button>
            ) : state.status === 'paused' ? (
              <button type="button" className="primary-button runtime-button" onClick={onResume}>
                <span className="button-label">
                  <PlayIcon aria-hidden="true" />
                  <span>Resume timer</span>
                </span>
              </button>
            ) : (
              <button type="button" className="primary-button runtime-button" onClick={onPause}>
                <span className="button-label">
                  <PauseIcon aria-hidden="true" />
                  <span>Pause timer</span>
                </span>
              </button>
            )}
            <button type="button" className="secondary-button runtime-button" onClick={onAbort}>
              <span className="button-label">
                <StopIcon aria-hidden="true" />
                <span>End session</span>
              </span>
            </button>
          </div>
        ) : null
      ) : (
        <div className="action-row">
          <button type="button" className="secondary-button" onClick={onReset}>
            <span className="button-label">
              <RefreshIcon aria-hidden="true" />
              <span>New session</span>
            </span>
          </button>
          {state.status !== 'aborted' ? (
            <button type="button" className="primary-button" onClick={onLogBatch}>
              <span className="button-label">
                <BottleIcon aria-hidden="true" />
                <span>Save chemistry log</span>
              </span>
            </button>
          ) : null}
        </div>
      )}

      <div className="plan-grid">
        <section className="panel stack">
          <div className="panel-heading">
            <h3>
              <span className="title-with-icon">
                <WorkflowIcon aria-hidden="true" />
                <span>Upcoming steps</span>
              </span>
            </h3>
            <p>Keep the current step and the next few steps in view during the session.</p>
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
            <h3>
              <span className="title-with-icon">
                <LogIcon aria-hidden="true" />
                <span>Session log</span>
              </span>
            </h3>
            <p>A local event history helps with recovery and troubleshooting.</p>
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
            <h3>
              <span className="title-with-icon">
                <BottleIcon aria-hidden="true" />
                <span>Most recent chemistry log</span>
              </span>
            </h3>
            <p>Quick reference for the last saved batch of this chemistry.</p>
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
