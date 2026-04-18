// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { defaultAlertProfiles, getRecipeById } from '../data/recipes';
import { createDefaultInputState, createSessionPlan } from '../domain/planner';
import { createActiveSession, startSession } from '../domain/runtime';
import { saveActiveSessionSnapshot } from '../storage/preferences';

function createMemoryStorage() {
  const data = new Map<string, string>();

  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => {
      data.clear();
    }
  };
}

function resetClientStorage() {
  window.localStorage?.clear?.();
  window.sessionStorage?.clear?.();
}

describe('App', () => {
  beforeEach(() => {
    const local = createMemoryStorage();
    const session = createMemoryStorage();

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: local
    });
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: session
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: local
    });
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: session
    });

    resetClientStorage();
    window.history.replaceState({}, '', '/');
  });

  it('navigates from recipes into setup', async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(
      screen.getByRole('heading', {
        name: /Film developing, guided step by step/i
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Cs41 powder kit/i }));

    expect(screen.getByRole('heading', { name: 'Cs41 powder kit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Review plan/i })).toBeInTheDocument();
  });

  it('saves a preset and reloads it from the saved library', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /HC-110/i }));
    await user.click(screen.getByRole('button', { name: /Review plan/i }));
    await user.click(screen.getByRole('button', { name: /Save preset/i }));

    await user.click(screen.getByRole('button', { name: /^Recipes$/i }));
    await user.click(screen.getByRole('button', { name: /Cs41 powder kit/i }));
    await user.click(screen.getByRole('button', { name: /^Saved$/i }));

    const savedPreset = await screen.findByRole('button', { name: /HC-110/i });
    await user.click(savedPreset);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'HC-110' })).toBeInTheDocument();
    });
  });

  it('defaults to Ultrared and shows export actions in settings', async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(
      screen.getByRole('button', { name: /^Switch to White light$/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Settings$/i }));

    const ultraredButton = await screen.findByRole('button', { name: /Ultrared/i });
    expect(ultraredButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Export presets/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export chemistry logs/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export all local data/i })).toBeInTheDocument();
  });

  it('opens the Mix tab and recalculates ratio math from pasted notation', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /^Mix$/i }));

    expect(screen.getByRole('heading', { name: /Mix calculator/i })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Dilute by ratio/i }));
    const ratioInput = screen.getByDisplayValue('1+31');
    await user.clear(ratioInput);
    await user.type(ratioInput, '30:50');

    expect(screen.getByText('187.5 ml')).toBeInTheDocument();
    expect(screen.getByText('312.5 ml')).toBeInTheDocument();
    expect(screen.getAllByText('500.0 ml').length).toBeGreaterThan(0);
  });

  it('surfaces HC-110 rescue guidance when the chosen dilution is too weak', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /HC-110/i }));

    await user.selectOptions(screen.getByLabelText(/Film format/i), '4x5');
    await user.clear(screen.getByLabelText(/Rolls or sheets/i));
    await user.type(screen.getByLabelText(/Rolls or sheets/i), '6');
    await user.selectOptions(screen.getByLabelText(/Dilution/i), '63');
    await user.clear(screen.getByLabelText(/Working solution volume/i));
    await user.type(screen.getByLabelText(/Working solution volume/i), '350');

    await user.click(screen.getByRole('button', { name: /Review plan/i }));

    expect(
      screen.getByRole('heading', { name: /HC-110 mix and capacity/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('6 sheets of 4x5')).toBeInTheDocument();
    expect(screen.getAllByText('120.0 in²').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Too dilute/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/B · 1\+31/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Minimum volume at 1\+63/i)).toBeInTheDocument();
    expect(screen.getByText('600 ml')).toBeInTheDocument();
  });

  it('rehydrates an in-progress session and asks for recovery confirmation', async () => {
    const user = userEvent.setup();
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_020_000);
    const recipeId = 'kodak-hc110';
    const recipe = getRecipeById(recipeId);
    const plan = createSessionPlan(
      recipeId,
      createDefaultInputState(recipe),
      defaultAlertProfiles[0],
    );

    const session = startSession(createActiveSession(plan, 1_000_000), 1_000_000);
    saveActiveSessionSnapshot(plan, {
      ...session,
      lastPersistedAtMs: 1_000_000
    });

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: /Recovered session/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Timing uncertainty: 20 sec\./i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Continue$/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Pause timer$/i })).toBeInTheDocument();
    });

    nowSpy.mockRestore();
  });

  it('unlocks hidden debug tools after repeated header taps', async () => {
    const user = userEvent.setup();

    render(<App />);

    const brandButton = screen.getByRole('button', {
      name: /Film Dev/i
    });

    for (let count = 0; count < 7; count += 1) {
      await user.click(brandButton);
    }

    expect(await screen.findByText(/Advanced diagnostics unlocked/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Settings$/i }));

    expect(
      await screen.findByRole('heading', { name: /Advanced diagnostics/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh log/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add breadcrumb/i })).toBeInTheDocument();
  });

  it('opens the About screen from the title bar and shows the creator note', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /^About$/i }));

    expect(
      await screen.findByRole('heading', { name: /Who made this strange little thing/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/passionate film photographer who occasionally fustigates himself/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Codex and GPT-5.4/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /leonardofiori.it/i })).toBeInTheDocument();
  });
});
