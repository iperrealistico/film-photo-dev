import { useState, type InputHTMLAttributes } from 'react';

interface NumericInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'inputMode' | 'onChange' | 'type' | 'value'
  > {
  value: number;
  onChange: (nextValue: number) => void;
}

function shouldUseDecimalKeyboard(step?: number | string, value?: number) {
  if (typeof step === 'number') {
    return !Number.isInteger(step);
  }

  if (typeof step === 'string' && step.length > 0) {
    const parsedStep = Number(step);

    if (!Number.isNaN(parsedStep)) {
      return !Number.isInteger(parsedStep);
    }
  }

  if (typeof value === 'number') {
    return !Number.isInteger(value);
  }

  return false;
}

function normalizeDraftValue(rawValue: string, allowDecimal: boolean) {
  const normalizedSeparators = rawValue.replace(/,/g, '.');
  const stripped = normalizedSeparators.replace(allowDecimal ? /[^0-9.]/g : /[^0-9]/g, '');

  if (!allowDecimal) {
    return stripped;
  }

  const [wholePart, ...rest] = stripped.split('.');

  if (rest.length === 0) {
    return stripped;
  }

  return `${wholePart}.${rest.join('')}`;
}

function parseDraftValue(rawValue: string) {
  if (rawValue.trim().length === 0) {
    return null;
  }

  const parsed = Number(rawValue);

  return Number.isNaN(parsed) ? null : parsed;
}

export function NumericInput({
  value,
  onChange,
  onBlur,
  onFocus,
  step,
  ...rest
}: NumericInputProps) {
  const [draftValue, setDraftValue] = useState<string | null>(null);
  const allowDecimal = shouldUseDecimalKeyboard(step, value);

  return (
    <input
      {...rest}
      step={step}
      type="text"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      pattern={allowDecimal ? '[0-9]*[.,]?[0-9]*' : '[0-9]*'}
      value={draftValue ?? String(value)}
      onFocus={(event) => {
        onFocus?.(event);
        setDraftValue('');
      }}
      onChange={(event) => {
        const nextDraftValue = normalizeDraftValue(event.target.value, allowDecimal);
        const parsedValue = parseDraftValue(nextDraftValue);

        setDraftValue(nextDraftValue);

        if (parsedValue !== null) {
          onChange(parsedValue);
        }
      }}
      onBlur={(event) => {
        onBlur?.(event);
        setDraftValue(null);
      }}
    />
  );
}
