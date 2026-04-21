import type { ComponentType } from 'react';
import { formatHc110CapacityWarning } from '../domain/planner';
import type {
  InputDefinition,
  RecipeDefinition,
  RecipeInputMap,
  SessionPlan
} from '../domain/types';
import {
  ClockIcon,
  FilmIcon,
  FlaskIcon,
  ShieldIcon,
  SlidersIcon,
  WarningIcon,
  WorkflowIcon,
  type IconProps
} from './icons';
import { NumericInput } from './NumericInput';

interface SetupFormProps {
  recipe: RecipeDefinition;
  plan: SessionPlan;
  values: RecipeInputMap;
  onChange: (inputId: string, value: string | number | boolean) => void;
}

const sectionOrder: Array<{
  id: InputDefinition['section'];
  title: string;
  description: string;
  icon: ComponentType<IconProps>;
}> = [
  {
    id: 'film',
    title: 'Film',
    description: 'Tell the recipe what film is in the tank and how you exposed it.',
    icon: FilmIcon
  },
  {
    id: 'chemistry',
    title: 'Chemistry',
    description: 'Set temperature, dilution, and batch-specific details.',
    icon: FlaskIcon
  },
  {
    id: 'workflow',
    title: 'Workflow',
    description: 'Choose the steps and timings for this process.',
    icon: WorkflowIcon
  },
  {
    id: 'runtime',
    title: 'Runtime',
    description: 'Adjust alerts and transition timing for darkroom use.',
    icon: ClockIcon
  }
];

function getNumericSnapshotValue(plan: SessionPlan, key: string) {
  const raw = plan.inputSnapshot[key];
  return typeof raw === 'number' ? raw : Number(raw ?? 0);
}

function getLiveHc110CapacityWarning(plan: SessionPlan) {
  const capacityCheck = plan.capacityCheck;
  const currentVolumeMl = getNumericSnapshotValue(plan, 'tankVolumeMl');
  const currentDilutionRatio = getNumericSnapshotValue(plan, 'dilution');
  const quantity = getNumericSnapshotValue(plan, 'quantity');

  if (
    !capacityCheck ||
    capacityCheck.status !== 'danger' ||
    currentVolumeMl <= 0 ||
    currentDilutionRatio <= 0 ||
    quantity <= 0
  ) {
    return null;
  }

  return {
    capacityCheck,
    currentDilutionRatio,
    warningText: formatHc110CapacityWarning(capacityCheck)
  };
}

export function SetupForm({ recipe, plan, values, onChange }: SetupFormProps) {
  return (
    <section className="stack">
      <div className="section-heading">
        <p className="eyebrow">Setup</p>
        <h2>
          <span className="title-with-icon title-with-icon--large">
            <SlidersIcon aria-hidden="true" />
            <span>{recipe.name}</span>
          </span>
        </h2>
        <p>{recipe.description}</p>
      </div>

      {plan.blockingIssues.length > 0 ? (
        <section className="capacity-banner capacity-danger stack" aria-live="polite">
          <div className="panel-heading panel-heading--tight">
            <h3>
              <span className="title-with-icon title-with-icon--compact">
                <WarningIcon aria-hidden="true" />
                <span>Unsupported right now</span>
              </span>
            </h3>
            <p>This combination does not match the official source data yet.</p>
          </div>
          <ul className="bullet-list">
            {plan.blockingIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {sectionOrder.map((section) => {
        const SectionIcon = section.icon;
        const liveHc110Warning =
          recipe.plannerId === 'hc110' && section.id === 'chemistry'
            ? getLiveHc110CapacityWarning(plan)
            : null;
        const inputs = recipe.inputs.filter((input) => {
          if (input.section !== section.id) {
            return false;
          }

          return input.isVisible ? input.isVisible(values) : true;
        });

        if (inputs.length === 0) {
          return null;
        }

        return (
          <section key={section.id} className="panel stack">
            <div className="panel-heading">
              <h3>
                <span className="title-with-icon">
                  <SectionIcon aria-hidden="true" />
                  <span>{section.title}</span>
                </span>
              </h3>
              <p>{section.description}</p>
            </div>
            {liveHc110Warning ? (
              <div className="capacity-banner capacity-danger stack" aria-live="polite">
                <div className="panel-heading panel-heading--tight">
                  <h4>
                    <span className="title-with-icon title-with-icon--compact">
                      <WarningIcon aria-hidden="true" />
                      <span>Too dilute right now</span>
                    </span>
                  </h4>
                  <p>{liveHc110Warning.warningText}</p>
                </div>
                <div className="fact-list">
                  <div className="fact-row emphasis-warn">
                    <span>Minimum syrup needed</span>
                    <strong>
                      {liveHc110Warning.capacityCheck.minimumActiveAgentMl.toFixed(1)} ml
                    </strong>
                  </div>
                  <div className="fact-row emphasis-warn">
                    <span>Actual syrup available</span>
                    <strong>
                      {liveHc110Warning.capacityCheck.actualActiveAgentMl.toFixed(1)} ml
                    </strong>
                  </div>
                  <div className="fact-row emphasis-warn">
                    <span>Stronger dilution that works</span>
                    <strong>
                      {liveHc110Warning.capacityCheck.recommendedDilutionLabel
                        ? `${liveHc110Warning.capacityCheck.recommendedDilutionLabel} · 1+${liveHc110Warning.capacityCheck.recommendedDilutionRatio}`
                        : 'Increase total volume first'}
                    </strong>
                  </div>
                  <div className="fact-row emphasis-warn">
                    <span>Minimum volume at 1+{liveHc110Warning.currentDilutionRatio}</span>
                    <strong>
                      {liveHc110Warning.capacityCheck.minimumVolumeAtCurrentDilutionMl.toFixed(0)} ml
                    </strong>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="field-grid">
              {inputs.map((input) => {
                const options = input.getOptions?.(values) ?? input.options ?? [];
                const rawValue = values[input.id];

                return (
                  <label key={input.id} className="field-shell">
                    <span className="field-label">
                      {input.label}
                      {input.unit ? <em>{input.unit}</em> : null}
                    </span>
                    {input.type === 'select' ? (
                      <select
                        className="field-select"
                        value={String(rawValue)}
                        onChange={(event) => onChange(input.id, event.target.value)}
                      >
                        {options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    {input.type === 'number' ? (
                      <NumericInput
                        className="field-input"
                        min={input.min}
                        max={input.max}
                        step={input.step}
                        value={Number(rawValue)}
                        onChange={(nextValue) => onChange(input.id, nextValue)}
                      />
                    ) : null}
                    {input.type === 'toggle' ? (
                      <button
                        type="button"
                        className={`toggle-button ${rawValue ? 'is-on' : ''}`}
                        aria-label={input.label}
                        aria-pressed={Boolean(rawValue)}
                        onClick={() => onChange(input.id, !rawValue)}
                      >
                        <span>{rawValue ? 'Enabled' : 'Disabled'}</span>
                        <strong>{rawValue ? 'On' : 'Off'}</strong>
                      </button>
                    ) : null}
                    {input.helperText ? (
                      <span className="field-help">{input.helperText}</span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          </section>
        );
      })}

      <section className="panel stack">
        <div className="panel-heading">
          <h3>
            <span className="title-with-icon">
              <ShieldIcon aria-hidden="true" />
              <span>Recipe source</span>
            </span>
          </h3>
          <p>Know where these numbers came from before you trust them in the darkroom.</p>
        </div>
        <div className="source-summary">
          <span className="source-chip">{recipe.source.label}</span>
          <strong>{recipe.source.title}</strong>
          <p>{recipe.notes[0]}</p>
        </div>
      </section>
    </section>
  );
}
