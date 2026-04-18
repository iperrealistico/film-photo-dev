import { describe, expect, it } from 'vitest';
import {
  calculateDilutionRatio,
  calculateMultiPart,
  calculateScaleKit,
  calculateUseWhatIHave,
  createDefaultMixWorkspaceState,
  parseRatioNotation
} from './mix';

describe('mix calculator domain', () => {
  it('scales a one-part bottle down to a smaller target batch', () => {
    const workspace = createDefaultMixWorkspaceState();
    const result = calculateScaleKit(workspace.scaleKit);

    expect(result.lines).toEqual([
      { label: 'Concentrate to measure', amountMl: 100 },
      { label: 'Water to add', amountMl: 400 },
      { label: 'Final volume', amountMl: 500 }
    ]);
    expect(result.bottleUsagePercent).toBe(10);
    expect(result.warnings).toEqual([]);
  });

  it('parses ratio text using both plus and colon notation', () => {
    expect(parseRatioNotation('1+31')).toEqual({
      chemicalParts: 1,
      waterParts: 31
    });
    expect(parseRatioNotation('30:50')).toEqual({
      chemicalParts: 30,
      waterParts: 50
    });
  });

  it('solves a ratio dilution to a target final volume', () => {
    const workspace = createDefaultMixWorkspaceState();
    const result = calculateDilutionRatio(workspace.dilutionRatio);

    expect(result.lines[0]).toEqual({
      label: 'Concentrate',
      amountMl: 15.625
    });
    expect(result.lines[1]).toEqual({
      label: 'Water',
      amountMl: 484.375
    });
    expect(result.lines[2]).toEqual({
      label: 'Final volume',
      amountMl: 500
    });
  });

  it('scales a multi-part recipe and tops up with water', () => {
    const workspace = createDefaultMixWorkspaceState();
    const result = calculateMultiPart(workspace.multiPart);

    expect(result.scaleFactor).toBe(0.5);
    expect(result.lines).toEqual([
      { label: 'Part A', amountMl: 12.5 },
      { label: 'Part B', amountMl: 12.5 },
      { label: 'Top-up water', amountMl: 475 },
      { label: 'Final volume', amountMl: 500 }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('calculates the maximum working solution from remaining concentrate', () => {
    const workspace = createDefaultMixWorkspaceState();
    const result = calculateUseWhatIHave(workspace.useWhatIHave);

    expect(result.lines).toEqual([
      { label: 'Concentrate on hand', amountMl: 18 },
      { label: 'Water to add', amountMl: 558 },
      { label: 'Maximum working volume', amountMl: 576 }
    ]);
    expect(result.warnings).toEqual([]);
  });
});
