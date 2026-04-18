import { formatDuration } from '../domain/format';
import type { RecipeDefinition, SessionPlan } from '../domain/types';

interface PlanReviewProps {
  recipe: RecipeDefinition;
  plan: SessionPlan;
  onSavePreset: () => void;
  onStartSession: () => void;
}

export function PlanReview({
  recipe,
  plan,
  onSavePreset,
  onStartSession
}: PlanReviewProps) {
  return (
    <section className="stack">
      <div className="section-heading">
        <p className="eyebrow">Mix and plan</p>
        <h2>Review the whole session before you start.</h2>
        <p>
          Timeline preview, chemistry math, and capacity checks stay together so
          the runtime screen can stay brutally simple later.
        </p>
      </div>

      <section className="panel plan-banner">
        <div>
          <span className={`tone-chip tone-chip--${recipe.accentTone}`}>
            {recipe.processType === 'color' ? 'Color' : 'B&W'}
          </span>
          <strong>{plan.sourceSummary}</strong>
        </div>
        <div>
          <span>Total session</span>
          <strong>{formatDuration(plan.totalDurationSec)}</strong>
        </div>
      </section>

      <div className="plan-grid">
        <section className="panel stack">
          <div className="panel-heading">
            <h3>Calculation breakdown</h3>
            <p>Nothing is hidden. This is the reasoning behind the generated time.</p>
          </div>
          <div className="fact-list">
            {plan.calculationLines.map((line) => (
              <div key={line.label} className={`fact-row emphasis-${line.emphasis ?? 'normal'}`}>
                <span>{line.label}</span>
                <strong>{line.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="panel stack">
          <div className="panel-heading">
            <h3>Mix and readiness</h3>
            <p>Preserve the old app’s strength: do the sanity checks before chemistry touches film.</p>
          </div>
          {plan.mixAmounts.length > 0 ? (
            <div className="fact-list">
              {plan.mixAmounts.map((amount) => (
                <div key={amount.label} className={`fact-row ${amount.emphasis ? 'is-strong' : ''}`}>
                  <span>{amount.label}</span>
                  <strong>{amount.amountMl.toFixed(1)} ml</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="soft-copy">This recipe does not need a mix calculator in the first slice.</p>
          )}
          {plan.capacityCheck ? (
            <div className={`capacity-banner capacity-${plan.capacityCheck.status}`}>
              <strong>{plan.capacityCheck.message}</strong>
              <p>
                Active agent {plan.capacityCheck.actualActiveAgentMl.toFixed(1)} ml · minimum{' '}
                {plan.capacityCheck.minimumActiveAgentMl.toFixed(1)} ml
              </p>
            </div>
          ) : null}
          <ul className="bullet-list">
            {plan.readinessChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel stack">
        <div className="panel-heading">
          <h3>Timeline preview</h3>
          <p>The full path stays visible now so the runtime console can focus on the current step only.</p>
        </div>
        <ol className="timeline-list">
          {plan.phaseList.map((phase, index) => (
            <li key={phase.id} className="timeline-step">
              <div className="timeline-step__index">{index + 1}</div>
              <div className="timeline-step__content">
                <div className="timeline-step__topline">
                  <strong>{phase.label}</strong>
                  <span>{formatDuration(phase.durationSec)}</span>
                </div>
                <p>{phase.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel stack">
        <div className="panel-heading">
          <h3>Warnings and next steps</h3>
          <p>Call out risk now, not after the user is already in the middle of the process.</p>
        </div>
        <div className="two-column-list">
          <div>
            <h4>Warnings</h4>
            <ul className="bullet-list">
              {plan.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Helpful reminders</h4>
            <ul className="bullet-list">
              {plan.nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="action-row">
        <button type="button" className="secondary-button" onClick={onSavePreset}>
          Save preset
        </button>
        <button type="button" className="primary-button" onClick={onStartSession}>
          Start darkroom mode
        </button>
      </div>
    </section>
  );
}
