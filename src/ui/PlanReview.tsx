import { formatDuration } from '../domain/format';
import type { RecipeDefinition, SessionPlan } from '../domain/types';
import {
  BookmarkIcon,
  CalculatorIcon,
  CheckCircleIcon,
  ClipboardIcon,
  FilmIcon,
  FlaskIcon,
  PlayIcon,
  ShieldIcon,
  WarningIcon,
  WorkflowIcon
} from './icons';

const capacityHeadingByStatus = {
  ok: 'Capacity OK',
  limit: 'At the edge',
  danger: 'Too dilute'
} as const;

function getNumericSnapshotValue(plan: SessionPlan, key: string) {
  const raw = plan.inputSnapshot[key];
  return typeof raw === 'number' ? raw : Number(raw ?? 0);
}

function formatHc110MaxLoad(format: string, units: number) {
  switch (format) {
    case '4x5':
    case '5x7':
    case '8x10':
      return `${units} sheet${units === 1 ? '' : 's'} of ${format}`;
    case '120':
      return `${units} 120 roll${units === 1 ? '' : 's'}`;
    default:
      return `${units} 35mm roll${units === 1 ? '' : 's'}`;
  }
}

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
  const isHc110Plan = recipe.id === 'kodak-hc110' && Boolean(plan.capacityCheck);
  const currentVolumeMl = getNumericSnapshotValue(plan, 'tankVolumeMl');
  const currentDilutionRatio = getNumericSnapshotValue(plan, 'dilution');
  const format = String(plan.inputSnapshot.filmFormat ?? '135-36exp');
  const totalMixAmountMl =
    plan.mixAmounts.reduce((sum, amount) => sum + amount.amountMl, 0) || currentVolumeMl;
  const CapacityIcon =
    plan.capacityCheck?.status === 'ok' ? CheckCircleIcon : WarningIcon;

  return (
    <section className="stack">
      <div className="section-heading">
        <p className="eyebrow">Review</p>
        <h2>
          <span className="title-with-icon title-with-icon--large">
            <ClipboardIcon aria-hidden="true" />
            <span>Check the whole session before you start.</span>
          </span>
        </h2>
        <p>
          See the timing math, mix amounts, and step order now so the live
          session screen can stay calm and simple.
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
            <h3>
              <span className="title-with-icon">
                <CalculatorIcon aria-hidden="true" />
                <span>Time and mix details</span>
              </span>
            </h3>
            <p>See where the numbers come from before you pour chemistry.</p>
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
            <h3>
              <span className="title-with-icon">
                <FlaskIcon aria-hidden="true" />
                <span>{isHc110Plan ? 'HC-110 mix and capacity' : 'Mix and prep'}</span>
              </span>
            </h3>
            <p>
              {isHc110Plan
                ? 'Check the working mix, film load, and dilution safety in one place before the film gets wet.'
                : 'Review the mix amounts and prep list before you start the timer.'}
            </p>
          </div>
          {isHc110Plan && plan.capacityCheck ? (
            <div className="hc110-guidance-grid">
              <div className="hc110-guidance-block stack">
                <div className="panel-heading panel-heading--tight">
                  <h4>
                    <span className="title-with-icon title-with-icon--compact">
                      <FlaskIcon aria-hidden="true" />
                      <span>Mix</span>
                    </span>
                  </h4>
                  <p>Measure the working solution for this run.</p>
                </div>
                <div className="fact-list">
                  <div className="fact-row">
                    <span>Total working volume</span>
                    <strong>{totalMixAmountMl.toFixed(1)} ml</strong>
                  </div>
                  {plan.mixAmounts.map((amount) => (
                    <div
                      key={amount.label}
                      className={`fact-row ${amount.emphasis ? 'is-strong' : ''}`}
                    >
                      <span>{amount.label}</span>
                      <strong>{amount.amountMl.toFixed(1)} ml</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="hc110-guidance-block stack">
                <div className="panel-heading panel-heading--tight">
                  <h4>
                    <span className="title-with-icon title-with-icon--compact">
                      <FilmIcon aria-hidden="true" />
                      <span>Film load</span>
                    </span>
                  </h4>
                  <p>Convert the film in the tank into one capacity check.</p>
                </div>
                <div className="fact-list">
                  <div className="fact-row">
                    <span>Loaded film</span>
                    <strong>{plan.capacityCheck.loadLabel}</strong>
                  </div>
                  <div className="fact-row">
                    <span>Total film area</span>
                    <strong>{plan.capacityCheck.filmAreaSqIn.toFixed(1)} in²</strong>
                  </div>
                </div>
              </div>

              <div
                className={`hc110-guidance-block capacity-banner capacity-${plan.capacityCheck.status}`}
              >
                <div className="stack">
                  <div className="panel-heading panel-heading--tight">
                    <h4>
                      <span className="title-with-icon title-with-icon--compact">
                        <CapacityIcon aria-hidden="true" />
                        <span>{capacityHeadingByStatus[plan.capacityCheck.status]}</span>
                      </span>
                    </h4>
                    <p>{plan.capacityCheck.message}</p>
                  </div>
                  <div className="fact-list">
                    <div className="fact-row">
                      <span>Minimum syrup needed</span>
                      <strong>{plan.capacityCheck.minimumActiveAgentMl.toFixed(1)} ml</strong>
                    </div>
                    <div className="fact-row">
                      <span>Actual syrup available</span>
                      <strong>{plan.capacityCheck.actualActiveAgentMl.toFixed(1)} ml</strong>
                    </div>
                    <div className="fact-row">
                      <span>Max safe load at this mix</span>
                      <strong>
                        {formatHc110MaxLoad(format, plan.capacityCheck.maxUnitsAtCurrentMix)}
                      </strong>
                    </div>
                  </div>
                  {plan.capacityCheck.status === 'danger' ? (
                    <div className="fact-list">
                      <div className="fact-row emphasis-warn">
                        <span>Stronger dilution that works</span>
                        <strong>
                          {plan.capacityCheck.recommendedDilutionLabel
                            ? `${plan.capacityCheck.recommendedDilutionLabel} · 1+${plan.capacityCheck.recommendedDilutionRatio}`
                            : 'Increase total volume first'}
                        </strong>
                      </div>
                      <div className="fact-row emphasis-warn">
                        <span>Minimum volume at 1+{currentDilutionRatio}</span>
                        <strong>
                          {plan.capacityCheck.minimumVolumeAtCurrentDilutionMl.toFixed(0)} ml
                        </strong>
                      </div>
                      <p className="soft-copy">
                        At {currentVolumeMl.toFixed(0)} ml, this load needs either a
                        stronger dilution or more working solution.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <>
              {plan.mixAmounts.length > 0 ? (
                <div className="fact-list">
                  {plan.mixAmounts.map((amount) => (
                    <div
                      key={amount.label}
                      className={`fact-row ${amount.emphasis ? 'is-strong' : ''}`}
                    >
                      <span>{amount.label}</span>
                      <strong>{amount.amountMl.toFixed(1)} ml</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="soft-copy">
                  This recipe does not need mix math in this review panel.
                </p>
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
            </>
          )}
          <ul className="bullet-list">
            {plan.readinessChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel stack">
        <div className="panel-heading">
          <h3>
            <span className="title-with-icon">
              <WorkflowIcon aria-hidden="true" />
              <span>Step-by-step timeline</span>
            </span>
          </h3>
          <p>Review the full sequence now. During the session, the app will only show the current step and what comes next.</p>
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
          <h3>
            <span className="title-with-icon">
              <ShieldIcon aria-hidden="true" />
              <span>Final checks</span>
            </span>
          </h3>
          <p>Catch the risks now, before the film is wet.</p>
        </div>
        <div className="two-column-list">
          <div>
            <h4>Watch for</h4>
            <ul className="bullet-list">
              {plan.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Before you start</h4>
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
          <span className="button-label">
            <BookmarkIcon aria-hidden="true" />
            <span>Save preset</span>
          </span>
        </button>
        <button type="button" className="primary-button" onClick={onStartSession}>
          <span className="button-label">
            <PlayIcon aria-hidden="true" />
            <span>Start session</span>
          </span>
        </button>
      </div>
    </section>
  );
}
