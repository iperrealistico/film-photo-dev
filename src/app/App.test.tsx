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
        name: /One app for color and B&W, without the single-file chaos/i
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Cs41 Powder/i }));

    expect(screen.getByRole('heading', { name: 'Cs41 Powder' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Review plan/i })).toBeInTheDocument();
  });

  it('saves a preset and reloads it from the saved library', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /HC-110/i }));
    await user.click(screen.getByRole('button', { name: /Review plan/i }));
    await user.click(screen.getByRole('button', { name: /Save preset/i }));

    await user.click(screen.getByRole('button', { name: /^Recipes$/i }));
    await user.click(screen.getByRole('button', { name: /Cs41 Powder/i }));
    await user.click(screen.getByRole('button', { name: /^Saved$/i }));

    const savedPreset = await screen.findByRole('button', { name: /HC-110/i });
    await user.click(savedPreset);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'HC-110' })).toBeInTheDocument();
    });
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
      await screen.findByRole('heading', { name: /Session recovered from local storage/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Timing uncertainty: 20 sec\./i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Continue with recovery/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Pause$/i })).toBeInTheDocument();
    });

    nowSpy.mockRestore();
  });

  it('unlocks hidden debug tools after repeated header taps', async () => {
    const user = userEvent.setup();

    render(<App />);

    const brandButton = screen.getByRole('button', {
      name: /Film Dev Offline darkroom companion/i
    });

    for (let count = 0; count < 7; count += 1) {
      await user.click(brandButton);
    }

    expect(await screen.findByText(/Hidden debug tools unlocked/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Settings$/i }));

    expect(
      await screen.findByRole('heading', { name: /Hidden debug tools/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh log/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Record breadcrumb/i })).toBeInTheDocument();
  });
});
