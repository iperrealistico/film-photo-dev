// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { defaultAlertProfiles, getRecipeById } from '../data/recipes';
import { createDefaultInputState, createSessionPlan } from '../domain/planner';
import { createActiveSession, startSession } from '../domain/runtime';
import { saveActiveSessionSnapshot } from '../storage/preferences';
import * as sessionAudio from './sessionAudio';

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
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

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
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn()
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: vi.fn()
    });
  });

  it('navigates from recipes into setup', async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByRole('button', { name: /^Home$/i })).toBeDisabled();

    expect(
      screen.getByRole('heading', {
        name: /Film developing, guided step by step/i
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Cs41 powder kit/i }));

    expect(screen.getByRole('heading', { name: 'Cs41 powder kit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Back$/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Review plan/i })).toBeInTheDocument();
  });

  it('asks for previously processed Cs41 units and exposes the optional blix extension toggle', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /Cs41 powder kit/i }));
    await user.selectOptions(screen.getByLabelText(/Developer condition/i), 'reused');

    expect(screen.getByText(/Units already processed/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /1 unit = one 135 roll, one 120 roll, one 8x10 sheet, or four 4x5 sheets\./i,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Reuse batch size/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Increase blix with reuse/i }),
    ).toBeInTheDocument();
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

  it('defaults to White light and shows export actions in settings', async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(
      screen.getByRole('button', { name: /^Switch to Red safe$/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Settings$/i }));

    const whiteLightButton = await screen.findByRole('button', { name: /White light/i });
    expect(whiteLightButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Export presets/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export chemistry logs/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export all local data/i })).toBeInTheDocument();
  });

  it('updates the browser theme color when switching light modes', async () => {
    const user = userEvent.setup();

    render(<App />);

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    expect(themeMeta).not.toBeNull();
    expect(themeMeta).toHaveAttribute('content', '#0d0f10');

    await user.click(screen.getByRole('button', { name: /^Settings$/i }));
    const themeModeGroup = await screen.findByRole('group', {
      name: /Darkroom light mode/i
    });

    await user.click(within(themeModeGroup).getByRole('button', { name: /Red safe/i }));

    expect(themeMeta).toHaveAttribute('content', '#4a0004');

    await user.click(within(themeModeGroup).getByRole('button', { name: /Reduced light/i }));

    expect(themeMeta).toHaveAttribute('content', '#2a0408');

    await user.click(within(themeModeGroup).getByRole('button', { name: /Standard/i }));

    expect(themeMeta).toHaveAttribute('content', '#0d0f10');
  });

  it('persists interaction settings after they are changed in settings', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(screen.getByRole('button', { name: /^Settings$/i }));
    await user.click(screen.getByRole('button', { name: /Screen animations/i }));
    await user.click(screen.getByRole('button', { name: /Button sounds/i }));
    await user.click(screen.getByRole('button', { name: /Pause between steps/i }));

    expect(screen.getByRole('button', { name: /Screen animations/i })).toHaveTextContent('Off');
    expect(screen.getByRole('button', { name: /Button sounds/i })).toHaveTextContent('Off');
    expect(screen.getByRole('button', { name: /Pause between steps/i })).toHaveTextContent('On');

    unmount();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^Settings$/i }));

    expect(await screen.findByRole('button', { name: /Screen animations/i })).toHaveTextContent(
      'Off',
    );
    expect(screen.getByRole('button', { name: /Button sounds/i })).toHaveTextContent('Off');
    expect(screen.getByRole('button', { name: /Pause between steps/i })).toHaveTextContent('On');
  });

  it('waits for manual confirmation before starting the next phase when pause-between-steps is enabled', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /^Settings$/i }));
    await user.click(screen.getByRole('button', { name: /Pause between steps/i }));
    await user.click(screen.getByRole('button', { name: /^Recipes$/i }));

    await user.click(screen.getByRole('button', { name: /Cs41 powder kit/i }));
    await user.click(screen.getByRole('button', { name: /Review plan/i }));
    const baseNow = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Start session/i }));
    });
    expect(screen.getByRole('button', { name: /^Pause timer$/i })).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400_000);
    });

    expect(screen.getByRole('button', { name: /Begin next step/i })).toBeInTheDocument();
    expect(screen.getByText(/timer paused until you confirm/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Pause timer$/i })).not.toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Begin next step/i }));
    });

    expect(screen.getByRole('button', { name: /^Pause timer$/i })).toBeInTheDocument();
  }, 10000);

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

  it('shows the HC-110 dilution warning live during setup before plan review', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /HC-110/i }));

    await user.selectOptions(screen.getByLabelText(/Film format/i), '4x5');
    await user.clear(screen.getByLabelText(/Rolls or sheets/i));
    await user.type(screen.getByLabelText(/Rolls or sheets/i), '6');
    await user.selectOptions(screen.getByLabelText(/Dilution/i), '63');
    await user.clear(screen.getByLabelText(/Working solution volume/i));
    await user.type(screen.getByLabelText(/Working solution volume/i), '350');

    expect(screen.getByRole('heading', { name: /Too dilute right now/i })).toBeInTheDocument();
    expect(
      screen.getByText(
        /Too dilute for this load\. At this volume, switch to B · 1\+31 or mix more working solution\./i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Minimum volume at 1\+63/i)).toBeInTheDocument();
    expect(screen.getByText('600 ml')).toBeInTheDocument();
  });

  it('lets the user return from review to setup with an in-page button', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /HC-110/i }));
    await user.click(screen.getByRole('button', { name: /Review plan/i }));
    await user.click(await screen.findByRole('button', { name: /Back to setup/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'HC-110' })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Review plan/i })).toBeInTheDocument();
  });

  it('blocks unsupported DF96 combinations on the review screen', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /Df96 monobath/i }));
    await user.selectOptions(screen.getByLabelText(/Monobath temperature/i), '65');

    const setupIssues = screen.getByRole('region', { name: /Setup issues/i });
    expect(
      within(setupIssues).getByRole('heading', { name: /Unsupported right now/i }),
    ).toBeInTheDocument();
    expect(within(setupIssues).getByRole('button', { name: /Ignore/i })).toBeInTheDocument();

    await user.click(within(setupIssues).getByRole('button', { name: /Ignore/i }));

    expect(screen.queryByRole('region', { name: /Setup issues/i })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/Monobath temperature/i), '70');

    expect(screen.getByRole('region', { name: /Setup issues/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Review plan/i }));

    expect(await screen.findByText(/Start blocked/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unsupported combo/i })).toBeDisabled();
    expect(screen.queryByRole('region', { name: /Setup issues/i })).not.toBeInTheDocument();
  });

  it('shows DF96 workflow controls together and explains reuse units like Cs41', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /Df96 monobath/i }));

    expect(
      screen.getByText(
        /Choose the exact film family from the official Df96 chart\./i,
      ),
    ).toBeInTheDocument();

    const workflowHeading = screen.getByRole('heading', { name: /^Workflow$/i });
    const workflowSection = workflowHeading.closest('section');
    if (!workflowSection) {
      throw new Error('Missing DF96 workflow section.');
    }

    expect(within(workflowSection).getByLabelText(/Monobath temperature/i)).toBeInTheDocument();
    expect(within(workflowSection).getByLabelText(/Agitation method/i)).toBeInTheDocument();

    const additionalOptionsHeading = screen.getByRole('heading', {
      name: /Additional options/i
    });
    const additionalOptionsSection = additionalOptionsHeading.closest('section');
    if (!additionalOptionsSection) {
      throw new Error('Missing DF96 additional options section.');
    }

    expect(
      within(additionalOptionsSection).getByLabelText(/Extra time above minimum/i),
    ).toBeInTheDocument();
    expect(
      within(additionalOptionsSection).getByLabelText(/Archival wash method/i),
    ).toBeInTheDocument();
    expect(
      within(additionalOptionsSection).getByLabelText(/Drain before wash/i),
    ).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/Chemistry condition/i), 'reused');

    expect(
      screen.getByText(
        /1 unit = one 135 roll, one 120 roll, one 8x10 sheet, or four 4x5 sheets\./i,
      ),
    ).toBeInTheDocument();
  });

  it('pauses automatically for manual DF96 wash steps', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /Df96 monobath/i }));
    await user.selectOptions(screen.getByLabelText(/Archival wash method/i), 'minimal');
    await user.click(screen.getByRole('button', { name: /Review plan/i }));

    const baseNow = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Start session/i }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200_000);
    });

    expect(screen.getByRole('button', { name: /Complete this step/i })).toBeInTheDocument();
    expect(screen.getByText(/manual on purpose/i)).toBeInTheDocument();
  }, 10000);

  it('keeps DF96 constant-agitation cues active past the first 30 seconds', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /Df96 monobath/i }));
    await user.click(screen.getByRole('button', { name: /Review plan/i }));

    const baseNow = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Start session/i }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(31_000);
    });

    expect(screen.getByText(/Keep agitation moving in 29s/i)).toBeInTheDocument();
    expect(screen.queryByText(/No more cues in this step/i)).not.toBeInTheDocument();
  }, 10000);

  it('plays explicit phase-transition sounds when DF96 moves into drain and wash', async () => {
    const user = userEvent.setup();
    const audioSpy = vi
      .spyOn(sessionAudio, 'playToneSequence')
      .mockImplementation(() => undefined);

    render(<App />);

    await user.click(screen.getByRole('button', { name: /Df96 monobath/i }));
    await user.click(screen.getByRole('button', { name: /Review plan/i }));

    const baseNow = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Start session/i }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(180_000);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(
      audioSpy.mock.calls.some(
        ([toneKinds]) =>
          Array.isArray(toneKinds) &&
          toneKinds[0] === 'phase_end' &&
          toneKinds[1] === 'drain',
      ),
    ).toBe(true);
    expect(
      audioSpy.mock.calls.some(
        ([toneKinds]) =>
          Array.isArray(toneKinds) &&
          toneKinds[0] === 'phase_end' &&
          toneKinds[1] === 'phase_start',
      ),
    ).toBe(true);
  }, 10000);

  it('scrolls back to the top when switching screens', async () => {
    const user = userEvent.setup();
    const scrollToSpy = vi.mocked(window.scrollTo);

    render(<App />);

    await user.click(screen.getByRole('button', { name: /HC-110/i }));
    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    });

    scrollToSpy.mockClear();

    await user.click(screen.getByRole('button', { name: /Review plan/i }));
    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
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

  it('opens the About screen from the page footer link and shows the creator note', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /About this app/i }));

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
