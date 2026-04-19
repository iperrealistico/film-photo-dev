// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { NumericInput } from './NumericInput';

function NumericInputHarness({
  initialValue,
  step
}: {
  initialValue: number;
  step: number;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <NumericInput
      aria-label="Numeric field"
      className="field-input"
      step={step}
      value={value}
      onChange={setValue}
    />
  );
}

describe('NumericInput', () => {
  it('uses the numeric keyboard for whole-number fields and clears on focus', async () => {
    const user = userEvent.setup();

    render(<NumericInputHarness initialValue={20} step={1} />);

    const input = screen.getByLabelText(/Numeric field/i);

    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).toHaveValue('20');

    await user.click(input);

    expect(input).toHaveValue('');

    await user.tab();

    expect(input).toHaveValue('20');
  });

  it('uses the decimal keyboard for fractional fields and replaces the value after focus', async () => {
    const user = userEvent.setup();

    render(<NumericInputHarness initialValue={20} step={0.5} />);

    const input = screen.getByLabelText(/Numeric field/i);

    expect(input).toHaveAttribute('inputmode', 'decimal');

    await user.click(input);
    await user.keyboard('25.5');

    expect(input).toHaveValue('25.5');
  });
});
