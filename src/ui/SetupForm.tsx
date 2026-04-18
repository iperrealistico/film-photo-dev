import type { ComponentType } from 'react';
import type { InputDefinition, RecipeDefinition, RecipeInputMap } from '../domain/types';
import {
  ClockIcon,
  FilmIcon,
  FlaskIcon,
  ShieldIcon,
  SlidersIcon,
  WorkflowIcon,
  type IconProps
} from './icons';

interface SetupFormProps {
  recipe: RecipeDefinition;
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

export function SetupForm({ recipe, values, onChange }: SetupFormProps) {
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

      {sectionOrder.map((section) => {
        const SectionIcon = section.icon;
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
                      <input
                        className="field-input"
                        type="number"
                        min={input.min}
                        max={input.max}
                        step={input.step}
                        value={Number(rawValue)}
                        onChange={(event) =>
                          onChange(input.id, Number(event.target.value))
                        }
                      />
                    ) : null}
                    {input.type === 'toggle' ? (
                      <button
                        type="button"
                        className={`toggle-button ${rawValue ? 'is-on' : ''}`}
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
