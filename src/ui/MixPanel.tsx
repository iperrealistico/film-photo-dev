import type { ComponentType } from 'react';
import {
  calculateDilutionRatio,
  calculateMultiPart,
  calculateScaleKit,
  calculateUseWhatIHave,
  commonRatioPresets,
  createRatioText,
  formatMl,
  formatVolumeInUnit,
  measurementUnitOptions,
  mixModeDefinitions,
  parseRatioNotation,
  toMilliliters
} from '../domain/mix';
import type {
  MeasurementUnit,
  MixCalculatorMode,
  MixPartInput,
  MixRatioState,
  MixUseWhatIHaveState,
  MixWorkspaceState,
  VolumeInput
} from '../domain/types';
import {
  BottleIcon,
  CalculatorIcon,
  ClipboardIcon,
  FlaskIcon,
  LayersIcon,
  PlusIcon,
  type IconProps
} from './icons';

interface MixPanelProps {
  workspace: MixWorkspaceState;
  onChange: (nextWorkspace: MixWorkspaceState) => void;
  onEvent?: (event: string, detail?: unknown) => void;
}

interface VolumeFieldProps {
  label: string;
  value: VolumeInput;
  helperText: string;
  onChange: (nextValue: VolumeInput) => void;
}

interface ModePickerProps {
  activeMode: MixCalculatorMode;
  onSelect: (mode: MixCalculatorMode) => void;
}

interface RatioPresetRowProps {
  onSelect: (chemicalParts: number, waterParts: number, label: string) => void;
}

interface ResultPanelProps {
  title: string;
  detail: string;
  icon: ComponentType<IconProps>;
  lines: Array<{
    label: string;
    value: string;
  }>;
  warnings: string[];
  footer?: string;
}

function VolumeField({ label, value, helperText, onChange }: VolumeFieldProps) {
  return (
    <label className="field-shell">
      <span className="field-label">{label}</span>
      <div className="volume-control-row">
        <input
          className="field-input"
          type="number"
          min={0}
          step={value.unit === 'l' ? 0.01 : 1}
          value={value.amount}
          onChange={(event) =>
            onChange({
              ...value,
              amount: Number(event.target.value)
            })
          }
        />
        <select
          className="field-select"
          value={value.unit}
          aria-label={`${label} unit`}
          onChange={(event) =>
            onChange({
              ...value,
              unit: event.target.value as MeasurementUnit
            })
          }
        >
          {measurementUnitOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <span className="field-help">{helperText}</span>
    </label>
  );
}

function ModePicker({ activeMode, onSelect }: ModePickerProps) {
  return (
    <div className="mix-mode-grid" role="tablist" aria-label="Mix calculator mode">
      {Object.entries(mixModeDefinitions).map(([mode, definition]) => {
        const ModeIcon = mixModeIcons[mode as MixCalculatorMode];

        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={activeMode === mode}
            className={`mix-mode-card ${activeMode === mode ? 'is-active' : ''}`}
            onClick={() => onSelect(mode as MixCalculatorMode)}
          >
            <div className="mix-mode-card__topline">
              <span className="surface-icon surface-icon--row">
                <ModeIcon aria-hidden="true" />
              </span>
              <div className="stack compact-stack">
                <span className="eyebrow">{definition.label}</span>
                <strong>{definition.title}</strong>
              </div>
            </div>
            <p>{definition.description}</p>
          </button>
        );
      })}
    </div>
  );
}

function RatioPresetRow({ onSelect }: RatioPresetRowProps) {
  return (
    <div className="mix-chip-row">
      {commonRatioPresets.map((preset) => (
        <button
          key={preset.label}
          type="button"
          className="chip-button"
          onClick={() => onSelect(preset.chemicalParts, preset.waterParts, preset.label)}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

function ResultPanel({
  title,
  detail,
  icon: Icon,
  lines,
  warnings,
  footer
}: ResultPanelProps) {
  return (
    <section className="panel stack">
      <div className="panel-heading">
        <h3>
          <span className="title-with-icon">
            <Icon aria-hidden="true" />
            <span>{title}</span>
          </span>
        </h3>
        <p>{detail}</p>
      </div>
      {lines.length > 0 ? (
        <div className="fact-list">
          {lines.map((line) => (
            <div key={`${line.label}-${line.value}`} className="fact-row is-strong">
              <span>{line.label}</span>
              <strong>{line.value}</strong>
            </div>
          ))}
        </div>
      ) : (
        <p className="soft-copy">Results appear here as soon as the inputs describe a valid mix.</p>
      )}
      {warnings.length > 0 ? (
        <ul className="bullet-list mix-warning-list">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
      {footer ? <p className="soft-copy">{footer}</p> : null}
    </section>
  );
}

function buildRatioNotationHelper(state: MixRatioState | MixUseWhatIHaveState) {
  const parsed = parseRatioNotation(state.ratioText);

  if (parsed) {
    return `Read as ${parsed.chemicalParts} part${parsed.chemicalParts === 1 ? '' : 's'} concentrate + ${parsed.waterParts} part${parsed.waterParts === 1 ? '' : 's'} water.`;
  }

  return 'Use 1+31, 1:31, or 30:50.';
}

const mixModeIcons: Record<MixCalculatorMode, ComponentType<IconProps>> = {
  scale_kit: BottleIcon,
  dilution_ratio: CalculatorIcon,
  multi_part: LayersIcon,
  use_what_i_have: FlaskIcon
};

export function MixPanel({ workspace, onChange, onEvent }: MixPanelProps) {
  const activeDefinition = mixModeDefinitions[workspace.activeMode];
  const ActiveModeIcon = mixModeIcons[workspace.activeMode];
  const scaleKitResult = calculateScaleKit(workspace.scaleKit);
  const dilutionRatioResult = calculateDilutionRatio(workspace.dilutionRatio);
  const multiPartResult = calculateMultiPart(workspace.multiPart);
  const useWhatIHaveResult = calculateUseWhatIHave(workspace.useWhatIHave);

  function updateWorkspace(nextWorkspace: MixWorkspaceState) {
    onChange(nextWorkspace);
  }

  function handleModeSelect(mode: MixCalculatorMode) {
    updateWorkspace({
      ...workspace,
      activeMode: mode
    });
    onEvent?.('mix_mode_changed', { mode });
  }

  function handleScaleKitVolumeChange(
    key: 'bottleSize' | 'fullYield' | 'targetAmount',
    nextValue: VolumeInput
  ) {
    updateWorkspace({
      ...workspace,
      scaleKit: {
        ...workspace.scaleKit,
        [key]: nextValue
      }
    });
  }

  function applyRatioState(
    key: 'dilutionRatio' | 'useWhatIHave',
    chemicalParts: number,
    waterParts: number,
    extraPatch?: Partial<MixRatioState & MixUseWhatIHaveState>
  ) {
    updateWorkspace({
      ...workspace,
      [key]: {
        ...workspace[key],
        ...extraPatch,
        chemicalParts,
        waterParts,
        ratioText: createRatioText(chemicalParts, waterParts)
      }
    });
  }

  function handleRatioTextChange(
    key: 'dilutionRatio' | 'useWhatIHave',
    ratioText: string
  ) {
    const parsed = parseRatioNotation(ratioText);

    updateWorkspace({
      ...workspace,
      [key]: {
        ...workspace[key],
        ratioText,
        ...(parsed ?? {})
      }
    });

    if (parsed) {
      onEvent?.('mix_ratio_parsed', {
        key,
        ratioText,
        chemicalParts: parsed.chemicalParts,
        waterParts: parsed.waterParts
      });
    }
  }

  function handleRatioTargetChange(nextValue: VolumeInput) {
    updateWorkspace({
      ...workspace,
      dilutionRatio: {
        ...workspace.dilutionRatio,
        targetAmount: nextValue
      }
    });
  }

  function handleRatioPartChange(key: 'chemicalParts' | 'waterParts', nextValue: number) {
    const nextChemicalParts =
      key === 'chemicalParts' ? nextValue : workspace.dilutionRatio.chemicalParts;
    const nextWaterParts =
      key === 'waterParts' ? nextValue : workspace.dilutionRatio.waterParts;

    applyRatioState('dilutionRatio', nextChemicalParts, nextWaterParts);
  }

  function handleUseWhatIHavePartChange(key: 'chemicalParts' | 'waterParts', nextValue: number) {
    const nextChemicalParts =
      key === 'chemicalParts' ? nextValue : workspace.useWhatIHave.chemicalParts;
    const nextWaterParts =
      key === 'waterParts' ? nextValue : workspace.useWhatIHave.waterParts;

    applyRatioState('useWhatIHave', nextChemicalParts, nextWaterParts);
  }

  function handleUseWhatIHaveConcentrateChange(nextValue: VolumeInput) {
    updateWorkspace({
      ...workspace,
      useWhatIHave: {
        ...workspace.useWhatIHave,
        concentrateOnHand: nextValue
      }
    });
  }

  function handleRatioPresetSelection(
    key: 'dilutionRatio' | 'useWhatIHave',
    chemicalParts: number,
    waterParts: number,
    label: string
  ) {
    applyRatioState(key, chemicalParts, waterParts);
    onEvent?.('mix_ratio_preset_selected', {
      key,
      label,
      chemicalParts,
      waterParts
    });
  }

  function handleMultiPartYieldChange(
    key: 'referenceYield' | 'targetAmount',
    nextValue: VolumeInput
  ) {
    updateWorkspace({
      ...workspace,
      multiPart: {
        ...workspace.multiPart,
        [key]: nextValue
      }
    });
  }

  function handleMultiPartItemChange(
    partId: string,
    patch: Partial<MixPartInput>
  ) {
    updateWorkspace({
      ...workspace,
      multiPart: {
        ...workspace.multiPart,
        parts: workspace.multiPart.parts.map((part) =>
          part.id === partId
            ? {
                ...part,
                ...patch
              }
            : part,
        )
      }
    });
  }

  function handleAddPart() {
    const partCount = workspace.multiPart.parts.length + 1;
    updateWorkspace({
      ...workspace,
      multiPart: {
        ...workspace.multiPart,
        parts: [
          ...workspace.multiPart.parts,
          {
            id: `part-${partCount}`,
            label: `Part ${String.fromCharCode(64 + partCount)}`,
            amountMl: 10
          }
        ]
      }
    });
    onEvent?.('mix_multi_part_added', { partCount });
  }

  function handleRemovePart(partId: string) {
    updateWorkspace({
      ...workspace,
      multiPart: {
        ...workspace.multiPart,
        parts: workspace.multiPart.parts.filter((part) => part.id !== partId)
      }
    });
  }

  const scaleKitFooter = `${formatVolumeInUnit(
    toMilliliters(workspace.scaleKit.targetAmount),
    workspace.scaleKit.targetAmount.unit
  )} target · ${scaleKitResult.bottleUsagePercent.toFixed(1)}% of the bottle used`;

  const ratioFooter = `${formatVolumeInUnit(
    toMilliliters(workspace.dilutionRatio.targetAmount),
    workspace.dilutionRatio.targetAmount.unit
  )} final target · outputs stay in ml for measuring`;

  const multiPartFooter = `${formatVolumeInUnit(
    toMilliliters(workspace.multiPart.targetAmount),
    workspace.multiPart.targetAmount.unit
  )} final target · scale factor ${multiPartResult.scaleFactor.toFixed(2)}x`;

  const onHandFooter = `${formatVolumeInUnit(
    toMilliliters(workspace.useWhatIHave.concentrateOnHand),
    workspace.useWhatIHave.concentrateOnHand.unit
  )} of concentrate left`;

  return (
    <section className="stack">
      <div className="section-heading">
        <p className="eyebrow">Quick calculations</p>
        <h2>
          <span className="title-with-icon title-with-icon--large">
            <CalculatorIcon aria-hidden="true" />
            <span>Mix calculator</span>
          </span>
        </h2>
        <p>
          Do the chemistry math here without changing a recipe. Scale bottles,
          solve dilution ratios, or work from whatever concentrate is left.
        </p>
      </div>

      <ModePicker activeMode={workspace.activeMode} onSelect={handleModeSelect} />

      <section className="panel stack">
        <div className="panel-heading">
          <h3>
            <span className="title-with-icon">
              <ActiveModeIcon aria-hidden="true" />
              <span>{activeDefinition.title}</span>
            </span>
          </h3>
          <p>{activeDefinition.description}</p>
        </div>

        {workspace.activeMode === 'scale_kit' ? (
          <div className="plan-grid">
            <section className="stack">
              <VolumeField
                label="Concentrate bottle size"
                value={workspace.scaleKit.bottleSize}
                helperText="How much concentrate the bottle contains when full."
                onChange={(nextValue) => handleScaleKitVolumeChange('bottleSize', nextValue)}
              />
              <VolumeField
                label="A full bottle makes"
                value={workspace.scaleKit.fullYield}
                helperText="The total working solution the full bottle is meant to make."
                onChange={(nextValue) => handleScaleKitVolumeChange('fullYield', nextValue)}
              />
              <VolumeField
                label="Batch to mix"
                value={workspace.scaleKit.targetAmount}
                helperText="The smaller batch you want to mix right now."
                onChange={(nextValue) => handleScaleKitVolumeChange('targetAmount', nextValue)}
              />
            </section>

            <ResultPanel
              title={scaleKitResult.title}
              detail={scaleKitResult.detail}
              icon={BottleIcon}
              lines={[
                ...scaleKitResult.lines.map((line) => ({
                  label: line.label,
                  value: formatMl(line.amountMl)
                })),
                {
                  label: 'Bottle used',
                  value: `${scaleKitResult.bottleUsagePercent.toFixed(1)}%`
                }
              ]}
              warnings={scaleKitResult.warnings}
              footer={scaleKitFooter}
            />
          </div>
        ) : null}

        {workspace.activeMode === 'dilution_ratio' ? (
          <div className="plan-grid">
            <section className="stack">
              <label className="field-shell">
                <span className="field-label">Ratio</span>
                <input
                  className="field-input"
                  type="text"
                  value={workspace.dilutionRatio.ratioText}
                  onChange={(event) => handleRatioTextChange('dilutionRatio', event.target.value)}
                />
                <span className="field-help">
                  {buildRatioNotationHelper(workspace.dilutionRatio)}
                </span>
              </label>
              <RatioPresetRow
                onSelect={(chemicalParts, waterParts, label) =>
                  handleRatioPresetSelection(
                    'dilutionRatio',
                    chemicalParts,
                    waterParts,
                    label
                  )
                }
              />
              <div className="field-grid">
                <label className="field-shell">
                  <span className="field-label">Concentrate parts</span>
                  <input
                    className="field-input"
                    type="number"
                    min={0}
                    step={0.1}
                    value={workspace.dilutionRatio.chemicalParts}
                    onChange={(event) =>
                      handleRatioPartChange('chemicalParts', Number(event.target.value))
                    }
                  />
                  <span className="field-help">The concentrate side of the ratio.</span>
                </label>
                <label className="field-shell">
                  <span className="field-label">Water parts</span>
                  <input
                    className="field-input"
                    type="number"
                    min={0}
                    step={0.1}
                    value={workspace.dilutionRatio.waterParts}
                    onChange={(event) =>
                      handleRatioPartChange('waterParts', Number(event.target.value))
                    }
                  />
                  <span className="field-help">The water side of the ratio.</span>
                </label>
              </div>
              <VolumeField
                label="Final batch size"
                value={workspace.dilutionRatio.targetAmount}
                helperText="The total working solution you want after dilution."
                onChange={handleRatioTargetChange}
              />
            </section>

            <ResultPanel
              title={dilutionRatioResult.title}
              detail={dilutionRatioResult.detail}
              icon={CalculatorIcon}
              lines={dilutionRatioResult.lines.map((line) => ({
                label: line.label,
                value: formatMl(line.amountMl)
              }))}
              warnings={dilutionRatioResult.warnings}
              footer={ratioFooter}
            />
          </div>
        ) : null}

        {workspace.activeMode === 'multi_part' ? (
          <div className="plan-grid">
            <section className="stack">
              <VolumeField
                label="Reference recipe yield"
                value={workspace.multiPart.referenceYield}
                helperText="The total final solution described by the original recipe."
                onChange={(nextValue) => handleMultiPartYieldChange('referenceYield', nextValue)}
              />
              <VolumeField
                label="Target batch size"
                value={workspace.multiPart.targetAmount}
                helperText="The final amount you want to mix right now."
                onChange={(nextValue) => handleMultiPartYieldChange('targetAmount', nextValue)}
              />
              <section className="panel panel--inner stack">
                <div className="panel-heading panel-heading--tight">
                  <h4>
                    <span className="title-with-icon title-with-icon--compact">
                      <LayersIcon aria-hidden="true" />
                      <span>Reference parts</span>
                    </span>
                  </h4>
                  <p>Enter each chemistry part from the original recipe in milliliters.</p>
                </div>
                <div className="stack compact-stack">
                  {workspace.multiPart.parts.map((part) => (
                    <div key={part.id} className="mix-part-row">
                      <label className="field-shell mix-part-row__field">
                        <span className="field-label">Part label</span>
                        <input
                          className="field-input"
                          type="text"
                          value={part.label}
                          onChange={(event) =>
                            handleMultiPartItemChange(part.id, { label: event.target.value })
                          }
                        />
                      </label>
                      <label className="field-shell mix-part-row__field">
                        <span className="field-label">{part.label || 'Part'} amount</span>
                        <input
                          className="field-input"
                          type="number"
                          min={0}
                          step={0.1}
                          value={part.amountMl}
                          onChange={(event) =>
                            handleMultiPartItemChange(part.id, {
                              amountMl: Number(event.target.value)
                            })
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className="secondary-button mix-part-row__action"
                        onClick={() => handleRemovePart(part.id)}
                        disabled={workspace.multiPart.parts.length <= 1}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" className="secondary-button" onClick={handleAddPart}>
                  <span className="button-label">
                    <PlusIcon aria-hidden="true" />
                    <span>Add part</span>
                  </span>
                </button>
              </section>
            </section>

            <ResultPanel
              title={multiPartResult.title}
              detail={multiPartResult.detail}
              icon={LayersIcon}
              lines={multiPartResult.lines.map((line) => ({
                label: line.label,
                value: formatMl(line.amountMl)
              }))}
              warnings={multiPartResult.warnings}
              footer={multiPartFooter}
            />
          </div>
        ) : null}

        {workspace.activeMode === 'use_what_i_have' ? (
          <div className="plan-grid">
            <section className="stack">
              <label className="field-shell">
                <span className="field-label">Ratio</span>
                <input
                  className="field-input"
                  type="text"
                  value={workspace.useWhatIHave.ratioText}
                  onChange={(event) => handleRatioTextChange('useWhatIHave', event.target.value)}
                />
                <span className="field-help">
                  {buildRatioNotationHelper(workspace.useWhatIHave)}
                </span>
              </label>
              <RatioPresetRow
                onSelect={(chemicalParts, waterParts, label) =>
                  handleRatioPresetSelection(
                    'useWhatIHave',
                    chemicalParts,
                    waterParts,
                    label
                  )
                }
              />
              <div className="field-grid">
                <label className="field-shell">
                  <span className="field-label">Concentrate parts</span>
                  <input
                    className="field-input"
                    type="number"
                    min={0}
                    step={0.1}
                    value={workspace.useWhatIHave.chemicalParts}
                    onChange={(event) =>
                      handleUseWhatIHavePartChange('chemicalParts', Number(event.target.value))
                    }
                  />
                  <span className="field-help">The concentrate side of the ratio.</span>
                </label>
                <label className="field-shell">
                  <span className="field-label">Water parts</span>
                  <input
                    className="field-input"
                    type="number"
                    min={0}
                    step={0.1}
                    value={workspace.useWhatIHave.waterParts}
                    onChange={(event) =>
                      handleUseWhatIHavePartChange('waterParts', Number(event.target.value))
                    }
                  />
                  <span className="field-help">The water side of the ratio.</span>
                </label>
              </div>
              <VolumeField
                label="Concentrate on hand"
                value={workspace.useWhatIHave.concentrateOnHand}
                helperText="How much concentrate you still have available."
                onChange={handleUseWhatIHaveConcentrateChange}
              />
            </section>

            <ResultPanel
              title={useWhatIHaveResult.title}
              detail={useWhatIHaveResult.detail}
              icon={FlaskIcon}
              lines={useWhatIHaveResult.lines.map((line) => ({
                label: line.label,
                value: formatMl(line.amountMl)
              }))}
              warnings={useWhatIHaveResult.warnings}
              footer={onHandFooter}
            />
          </div>
        ) : null}
      </section>

      <section className="panel stack">
        <div className="panel-heading">
          <h3>
            <span className="title-with-icon">
              <ClipboardIcon aria-hidden="true" />
              <span>Possible next tools</span>
            </span>
          </h3>
          <p>Useful additions for a later release.</p>
        </div>
        <ul className="bullet-list">
          <li>Tank capacity and film-load checks for developers such as HC-110.</li>
          <li>Replenishment and top-up math for reusable chemistry.</li>
          <li>Split-batch planning for decanting larger mixes into storage bottles.</li>
          <li>Fast unit conversion between ml, cc, cl, and liters.</li>
        </ul>
      </section>
    </section>
  );
}
