// @vitest-environment jsdom

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { defaultAlertProfiles, getRecipeById } from "../data/recipes";
import { createDefaultInputState, createSessionPlan } from "../domain/planner";
import { createActiveSession, startSession } from "../domain/runtime";
import { saveActiveSessionSnapshot } from "../storage/preferences";
import * as sessionAudio from "./sessionAudio";
import * as sessionNotices from "./sessionNotices";

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
    },
  };
}

function resetClientStorage() {
  window.localStorage?.clear?.();
  window.sessionStorage?.clear?.();
}

const preferencesStorageKey = "film-dev/preferences/v1";

function storePreferences(partial: Record<string, unknown>) {
  window.localStorage?.setItem(
    preferencesStorageKey,
    JSON.stringify(partial),
  );
}

function disableSessionStartCountdown() {
  storePreferences({ sessionStartCountdownSec: 0 });
}

describe("App", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    const local = createMemoryStorage();
    const session = createMemoryStorage();

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: local,
    });
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: session,
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: local,
    });
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: session,
    });

    resetClientStorage();
    disableSessionStartCountdown();
    window.history.replaceState({}, "", "/");
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("navigates from recipes into setup", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByRole("button", { name: /^Home$/i })).toBeDisabled();

    expect(
      screen.getByRole("heading", {
        name: /Film developing, guided step by step/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Batches$/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Cs41 powder kit/i }));

    expect(
      screen.getByRole("heading", { name: "Cs41 powder kit" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Back$/i })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: /Review plan/i }),
    ).toBeInTheDocument();
  });

  it("shows an iPhone red-light tips card on the home screen", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: /iPhone red-light tips/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Reduce your screen brightness before you start\./i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Enable Color Filters if you want the whole screen tinted red\./i),
    ).toBeInTheDocument();
  });

  it("sizes the bottom navigation grid to the rendered tab count", () => {
    const { container } = render(<App />);
    const bottomNavInner = container.querySelector(".bottom-nav__inner");

    expect(bottomNavInner).not.toBeNull();
    expect(bottomNavInner).toHaveStyle({
      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    });
    expect(within(bottomNavInner as HTMLElement).getAllByRole("button")).toHaveLength(
      4,
    );
  });

  it("asks for previously processed Cs41 units and exposes the optional blix extension toggle", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /Cs41 powder kit/i }));
    await user.selectOptions(
      screen.getByLabelText(/Developer condition/i),
      "reused",
    );

    expect(screen.getByText(/Units already processed/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /1 unit = one 135 roll, one 120 roll, one 8x10 sheet, or four 4x5 sheets\./i,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Reuse batch size/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Increase blix with reuse/i }),
    ).toBeInTheDocument();
  });

  it("saves a preset and reloads it from the saved library", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /HC-110/i }));
    await user.click(screen.getByRole("button", { name: /Review plan/i }));
    await user.click(screen.getByRole("button", { name: /Save preset/i }));

    await user.click(screen.getByRole("button", { name: /^Recipes$/i }));
    await user.click(screen.getByRole("button", { name: /Cs41 powder kit/i }));
    await user.click(screen.getByRole("button", { name: /^Saved$/i }));

    const savedPreset = await screen.findByRole("button", { name: /HC-110/i });
    await user.click(savedPreset);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "HC-110" }),
      ).toBeInTheDocument();
    });
  });

  it("defaults to White light and shows export actions in settings", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(
      screen.getByRole("button", { name: /^Switch to Red safe$/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Settings$/i }));

    const whiteLightButton = await screen.findByRole("button", {
      name: /White light/i,
    });
    expect(whiteLightButton).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: /Paper light/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Export presets/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Export chemistry logs/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Export all local data/i }),
    ).toBeInTheDocument();
  });

  it("updates the browser theme color when switching light modes", async () => {
    const user = userEvent.setup();

    render(<App />);

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    expect(themeMeta).not.toBeNull();
    expect(themeMeta).toHaveAttribute("content", "#0d0f10");

    await user.click(screen.getByRole("button", { name: /^Settings$/i }));
    const themeModeGroup = await screen.findByRole("group", {
      name: /Darkroom light mode/i,
    });

    await user.click(
      within(themeModeGroup).getByRole("button", { name: /Paper light/i }),
    );

    expect(themeMeta).toHaveAttribute("content", "#f4ecdd");

    await user.click(
      within(themeModeGroup).getByRole("button", { name: /Red safe/i }),
    );

    expect(themeMeta).toHaveAttribute("content", "#4a0004");
    await user.click(
      screen.getByRole("button", { name: /Continue in red safe/i }),
    );

    await user.click(
      within(themeModeGroup).getByRole("button", { name: /Reduced light/i }),
    );

    expect(themeMeta).toHaveAttribute("content", "#2a0408");

    await user.click(
      within(themeModeGroup).getByRole("button", { name: /White light/i }),
    );

    expect(themeMeta).toHaveAttribute("content", "#0d0f10");
  });

  it("shows a dismissable warning when red safe mode is selected", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /^Settings$/i }));
    const themeModeGroup = await screen.findByRole("group", {
      name: /Darkroom light mode/i,
    });
    await user.click(
      within(themeModeGroup).getByRole("button", { name: /Red safe/i }),
    );

    const warning = await screen.findByRole("alertdialog");
    expect(warning).toHaveTextContent(
      /Some device UI will stay outside the red tint/i,
    );
    expect(warning).toHaveTextContent(/Enable Color Filters/i);
    expect(warning).toHaveTextContent(
      /Reduce White Point to make bright whites less harsh/i,
    );

    await user.click(
      within(warning).getByRole("button", { name: /Continue in red safe/i }),
    );

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });

  it("shows the same warning when the quick toggle enters red safe mode", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(
      screen.getByRole("button", { name: /^Switch to Red safe$/i }),
    );

    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
  });

  it("persists interaction settings after they are changed in settings", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(screen.getByRole("button", { name: /^Settings$/i }));
    expect(
      screen.getByText(
        /Experimental: this may still behave unexpectedly around some step transitions\./i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Additional voice prompts/i }),
    ).toHaveTextContent("Off");
    await user.click(
      screen.getByRole("button", { name: /Screen animations/i }),
    );
    await user.click(screen.getByRole("button", { name: /Button sounds/i }));
    await user.click(
      screen.getByRole("button", { name: /^Voice prompts(?:On|Off)$/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /Additional voice prompts/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /Pause between steps/i }),
    );

    expect(
      screen.getByRole("button", { name: /Screen animations/i }),
    ).toHaveTextContent("Off");
    expect(
      screen.getByRole("button", { name: /Button sounds/i }),
    ).toHaveTextContent("Off");
    expect(
      screen.getByRole("button", {
        name: /^Voice prompts(?:On|Off)$/i,
      }),
    ).toHaveTextContent("Off");
    expect(
      screen.getByRole("button", { name: /Additional voice prompts/i }),
    ).toHaveTextContent("On");
    expect(
      screen.getByRole("button", { name: /Pause between steps/i }),
    ).toHaveTextContent("On");

    unmount();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /^Settings$/i }));

    expect(
      await screen.findByRole("button", { name: /Screen animations/i }),
    ).toHaveTextContent("Off");
    expect(
      screen.getByRole("button", { name: /Button sounds/i }),
    ).toHaveTextContent("Off");
    expect(
      screen.getByRole("button", {
        name: /^Voice prompts(?:On|Off)$/i,
      }),
    ).toHaveTextContent("Off");
    expect(
      screen.getByRole("button", { name: /Additional voice prompts/i }),
    ).toHaveTextContent("On");
    expect(
      screen.getByRole("button", { name: /Pause between steps/i }),
    ).toHaveTextContent("On");
  });

  it("plays bundled voice prompts only when the voice setting is enabled", async () => {
    const user = userEvent.setup();
    const voiceSpy = vi
      .spyOn(sessionNotices, "playSessionNoticeVoice")
      .mockResolvedValue(undefined);
    const { unmount } = render(<App />);

    await user.click(screen.getByRole("button", { name: /Df96 monobath/i }));
    await user.click(screen.getByRole("button", { name: /Review plan/i }));

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Start session/i }));
    });

    expect(voiceSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: "pour_monobath" }),
      expect.objectContaining({ playbackRate: 1.5, volume: 1 }),
    );
    const enabledCallCount = voiceSpy.mock.calls.length;

    unmount();
    resetClientStorage();
    disableSessionStartCountdown();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /^Settings$/i }));
    await user.click(
      screen.getByRole("button", { name: /^Voice prompts(?:On|Off)$/i }),
    );
    await user.click(screen.getByRole("button", { name: /^Recipes$/i }));
    await user.click(screen.getByRole("button", { name: /Df96 monobath/i }));
    await user.click(screen.getByRole("button", { name: /Review plan/i }));

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Start session/i }));
    });

    expect(voiceSpy.mock.calls).toHaveLength(enabledCallCount);
  }, 10000);

  it("plays the blocked-review voice prompt only when additional voice prompts are enabled", async () => {
    const user = userEvent.setup();
    const voiceSpy = vi
      .spyOn(sessionNotices, "playSessionNoticeVoice")
      .mockResolvedValue(undefined);

    render(<App />);

    await user.click(screen.getByRole("button", { name: /^Settings$/i }));
    await user.click(
      screen.getByRole("button", { name: /Additional voice prompts/i }),
    );
    await user.click(screen.getByRole("button", { name: /^Recipes$/i }));
    await user.click(screen.getByRole("button", { name: /Df96 monobath/i }));
    await user.selectOptions(
      screen.getByLabelText(/Monobath temperature/i),
      "65",
    );
    await user.click(
      within(screen.getByRole("region", { name: /Setup issues/i })).getByRole(
        "button",
        { name: /Ignore/i },
      ),
    );
    await user.selectOptions(
      screen.getByLabelText(/Monobath temperature/i),
      "70",
    );
    await user.click(screen.getByRole("button", { name: /Review plan/i }));

    expect(await screen.findByText(/Start blocked/i)).toBeInTheDocument();
    expect(
      voiceSpy.mock.calls.some(
        ([spec]) => spec.id === "review_blocked",
      ),
    ).toBe(true);
  });

  it("plays the recovery voice prompt when additional voice prompts are enabled", async () => {
    const user = userEvent.setup();
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_020_000);
    const voiceSpy = vi
      .spyOn(sessionNotices, "playSessionNoticeVoice")
      .mockResolvedValue(undefined);
    const recipeId = "kodak-hc110";
    const recipe = getRecipeById(recipeId);
    const plan = createSessionPlan(
      recipeId,
      createDefaultInputState(recipe),
      defaultAlertProfiles[0],
    );

    storePreferences({ additionalSpeechPromptsEnabled: true });

    const session = startSession(
      createActiveSession(plan, 1_000_000),
      1_000_000,
    );
    saveActiveSessionSnapshot(plan, {
      ...session,
      lastPersistedAtMs: 1_000_000,
    });

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: /Recovered session/i }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        voiceSpy.mock.calls.some(
          ([spec]) => spec.id === "recovered_session",
        ),
      ).toBe(true);
    });

    await user.click(screen.getByRole("button", { name: /^Continue$/i }));

    nowSpy.mockRestore();
  });

  it("plays the waiting voice prompt after a gated phase change when additional voice prompts are enabled", async () => {
    const user = userEvent.setup();
    const voiceSpy = vi
      .spyOn(sessionNotices, "playSessionNoticeVoice")
      .mockResolvedValue(undefined);

    render(<App />);

    await user.click(screen.getByRole("button", { name: /^Settings$/i }));
    await user.click(
      screen.getByRole("button", { name: /Additional voice prompts/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /Pause between steps/i }),
    );
    await user.click(screen.getByRole("button", { name: /^Recipes$/i }));
    await user.click(screen.getByRole("button", { name: /Cs41 powder kit/i }));
    await user.click(screen.getByRole("button", { name: /Review plan/i }));

    const baseNow = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Start session/i }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400_000);
    });

    expect(
      screen.getByRole("button", { name: /Begin next step/i }),
    ).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_500);
    });

    expect(
      voiceSpy.mock.calls.some(
        ([spec]) => spec.id === "next_step_waiting",
      ),
    ).toBe(true);
  }, 10000);

  it("uses the default 3-second start countdown before the timer begins", async () => {
    const user = userEvent.setup();

    resetClientStorage();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Df96 monobath/i }));
    await user.selectOptions(
      screen.getByLabelText(/Monobath temperature/i),
      "75",
    );
    await user.selectOptions(
      screen.getByLabelText(/Agitation method/i),
      "intermittent",
    );
    await user.click(screen.getByRole("button", { name: /Review plan/i }));

    const baseNow = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Start session/i }));
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      /Starting in 3 seconds/i,
    );
    expect(
      screen.getByRole("button", { name: /Starting soon/i }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /Pause timer/i }),
    ).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_500);
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Pause timer/i }),
    ).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      /Pour monobath/i,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      /Agitate continuously for 30 sec/i,
    );
    expect(
      screen.getByRole("button", { name: /Pause timer/i }),
    ).toBeInTheDocument();
  }, 10000);

  it("plays the countdown voice prompt and then the first DF96 agitation voice prompt", async () => {
    const user = userEvent.setup();
    const voiceSpy = vi
      .spyOn(sessionNotices, "playSessionNoticeVoice")
      .mockResolvedValue(undefined);

    resetClientStorage();
    storePreferences({ speechPromptsEnabled: true });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Df96 monobath/i }));
    await user.selectOptions(
      screen.getByLabelText(/Monobath temperature/i),
      "75",
    );
    await user.selectOptions(
      screen.getByLabelText(/Agitation method/i),
      "intermittent",
    );
    await user.click(screen.getByRole("button", { name: /Review plan/i }));

    const baseNow = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Start session/i }));
    });

    expect(
      voiceSpy.mock.calls.some(
        ([spec]) => spec?.id === "starting_in_3",
      ),
    ).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_200);
    });

    expect(
      voiceSpy.mock.calls.some(
        ([spec]) => spec?.id === "pour_monobath",
      ),
    ).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(
      voiceSpy.mock.calls.some(
        ([spec]) => spec?.id === "agitate_continuously_30_sec",
      ),
    ).toBe(true);
    expect(screen.getByRole("status")).toHaveTextContent(
      /Agitate continuously for 30 sec/i,
    );
  }, 10000);

  it("lets developers change the session start countdown in hidden settings", async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/?debug=1");
    const { unmount } = render(<App />);

    await user.click(screen.getByRole("button", { name: /^Settings$/i }));

    const countdownInput = await screen.findByRole("textbox", {
      name: /Session start countdown/i,
    });

    fireEvent.focus(countdownInput);
    fireEvent.change(countdownInput, { target: { value: "5" } });
    fireEvent.blur(countdownInput);

    expect(countdownInput).toHaveValue("5");

    unmount();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /^Settings$/i }));

    expect(
      await screen.findByRole("textbox", {
        name: /Session start countdown/i,
      }),
    ).toHaveValue("5");
  });

  it("shows a debug-mode toggle and persists the global time multiplier", async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/?debug=1");
    const { unmount } = render(<App />);

    await user.click(screen.getByRole("button", { name: /^Settings$/i }));

    const debugModeButton = await screen.findByRole("button", {
      name: /Debug mode/i,
    });
    expect(
      screen.queryByRole("slider", { name: /Global time multiplier/i }),
    ).not.toBeInTheDocument();

    await user.click(debugModeButton);

    const multiplierSlider = await screen.findByRole("slider", {
      name: /Global time multiplier/i,
    });
    fireEvent.change(multiplierSlider, { target: { value: "2.5" } });
    expect(multiplierSlider).toHaveValue("2.5");

    unmount();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /^Settings$/i }));

    expect(
      await screen.findByRole("slider", {
        name: /Global time multiplier/i,
      }),
    ).toHaveValue("2.5");
  });

  it("speeds up the default start countdown when debug mode runs at 2x", async () => {
    const user = userEvent.setup();

    resetClientStorage();
    storePreferences({
      debugUnlocked: true,
      debugModeEnabled: true,
      globalTimeMultiplier: 2,
      globalTimeAnchorRealMs: 0,
      globalTimeAnchorAppMs: 0,
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Df96 monobath/i }));
    await user.selectOptions(
      screen.getByLabelText(/Monobath temperature/i),
      "75",
    );
    await user.selectOptions(
      screen.getByLabelText(/Agitation method/i),
      "intermittent",
    );
    await user.click(screen.getByRole("button", { name: /Review plan/i }));

    const baseNow = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Start session/i }));
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      /Starting in 3 seconds/i,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_600);
    });

    expect(screen.getByRole("status")).toHaveTextContent(/Pour monobath/i);
  }, 10000);

  it("keeps high-speed runtime cues visible instead of skipping past them at 10x", async () => {
    const user = userEvent.setup();

    storePreferences({
      debugUnlocked: true,
      debugModeEnabled: true,
      globalTimeMultiplier: 10,
      globalTimeAnchorRealMs: 0,
      globalTimeAnchorAppMs: 0,
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Df96 monobath/i }));
    await user.selectOptions(
      screen.getByLabelText(/Monobath temperature/i),
      "75",
    );
    await user.selectOptions(
      screen.getByLabelText(/Agitation method/i),
      "intermittent",
    );
    await user.click(screen.getByRole("button", { name: /Review plan/i }));

    const baseNow = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Start session/i }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_600);
    });

    expect(screen.getByText(/Agitate continuously for 30 sec/i)).toBeInTheDocument();
  }, 10000);

  it("applies the large CTA treatment to the major session controls", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /Df96 monobath/i }));
    await user.click(screen.getByRole("button", { name: /Review plan/i }));

    expect(screen.getByRole("button", { name: /Start session/i })).toHaveClass(
      "cta-button",
    );

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Start session/i }));
    });

    expect(screen.getByRole("button", { name: /Pause timer/i })).toHaveClass(
      "cta-button",
    );
    expect(screen.getByRole("button", { name: /End session/i })).toHaveClass(
      "cta-button",
    );
  });

  it("shows the first HC-110 continuous-agitation notice right after the countdown", async () => {
    const user = userEvent.setup();

    resetClientStorage();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /HC-110/i }));
    await user.selectOptions(screen.getByLabelText(/^Agitation$/i), "continuous");
    await user.click(screen.getByRole("button", { name: /Review plan/i }));

    const baseNow = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Start session/i }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_200);
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      /Pour developer/i,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      /Start continuous agitation/i,
    );
  }, 10000);

  it("shows the first HC-110 intermittent inversion notice and then the stop notice for the opening set", async () => {
    const user = userEvent.setup();

    resetClientStorage();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /HC-110/i }));
    await user.selectOptions(screen.getByLabelText(/^Agitation$/i), "intermittent");
    await user.click(screen.getByRole("button", { name: /Review plan/i }));

    const baseNow = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Start session/i }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_200);
    });

    expect(screen.getByRole("status")).toHaveTextContent(/Pour developer/i);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.getByRole("status")).toHaveTextContent(/Invert 1/i);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(screen.getByRole("status")).toHaveTextContent(/Stop agitation/i);
  }, 10000);

  it("shows the first Cs41 developer agitation notice after the pre-soak handoff", async () => {
    const user = userEvent.setup();

    resetClientStorage();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Cs41 powder kit/i }));
    await user.click(screen.getByRole("button", { name: /Review plan/i }));

    const baseNow = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Start session/i }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(93_200);
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      /Agitate continuously for 10 sec/i,
    );
  }, 10000);

  it("keeps the main navigation controls glove-sized across the shell", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByRole("button", { name: /^Home$/i })).toHaveClass(
      "glove-button",
    );
    expect(
      screen.getByRole("button", { name: /^Switch to Red safe$/i }),
    ).toHaveClass("glove-button");
    expect(screen.getByRole("button", { name: /^Recipes$/i })).toHaveClass(
      "glove-button",
    );

    const settingsNavButton = screen.getByRole("button", { name: /^Settings$/i });
    expect(settingsNavButton).toHaveClass("glove-button");

    await user.click(screen.getByRole("button", { name: /Df96 monobath/i }));

    expect(screen.getByRole("button", { name: /Back to recipes/i })).toHaveClass(
      "cta-button",
    );
    expect(screen.getByRole("button", { name: /Review plan/i })).toHaveClass(
      "cta-button",
    );

    await user.click(screen.getByRole("button", { name: /Review plan/i }));

    expect(screen.getByRole("button", { name: /Back to setup/i })).toHaveClass(
      "cta-button",
    );
    expect(screen.getByRole("button", { name: /Save preset/i })).toHaveClass(
      "cta-button",
    );
  });

  it("shows the selected light mode summary in settings", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /^Settings$/i }));

    const currentMode = await screen.findByText(/Current mode/i);
    const currentModeCard = currentMode.closest(".theme-mode-current");

    expect(currentModeCard).not.toBeNull();
    expect(currentModeCard).toHaveTextContent(/White light/i);
    expect(currentModeCard).toHaveTextContent(
      /Balanced contrast with the cleanest all-purpose view/i,
    );

    await user.click(screen.getByRole("button", { name: /Paper light/i }));

    expect(currentModeCard).toHaveTextContent(/Paper light/i);
    expect(currentModeCard).toHaveTextContent(
      /Warm paper-white surfaces for setup, review, and daylight planning/i,
    );
  });

  it("shows fullscreen notices for inversion cues", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /Cs41 powder kit/i }));
    await user.click(screen.getByRole("button", { name: /Review plan/i }));

    const baseNow = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Start session/i }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_200);
    });

    expect(screen.getByRole("status")).toHaveTextContent(/Invert/i);
  }, 10000);

  it("shows fullscreen notices for phase changes", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /Df96 monobath/i }));
    await user.click(screen.getByRole("button", { name: /Review plan/i }));

    const baseNow = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Start session/i }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(190_200);
    });

    expect(screen.getByRole("status")).toHaveTextContent(/Drain monobath/i);
  }, 10000);

  it("shows a fullscreen notice when the user stops a session", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(screen.getByRole("button", { name: /Df96 monobath/i }));
    await user.click(screen.getByRole("button", { name: /Review plan/i }));

    const baseNow = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Start session/i }));
    });

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /End session/i }));
    });

    expect(screen.getByRole("status")).toHaveTextContent(/Session stopped/i);
    expect(
      screen.getByRole("button", { name: /Set up another session/i }),
    ).toHaveClass("primary-button", "cta-button");

    const currentPhasePill = container.querySelector(".phase-pill.is-current");
    expect(currentPhasePill).not.toBeNull();
    const frozenPhaseText = currentPhasePill?.textContent;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });

    expect(container.querySelector(".phase-pill.is-current")?.textContent).toBe(
      frozenPhaseText,
    );
  }, 10000);

  it("keeps the session summary frozen when a paused run is stopped", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(screen.getByRole("button", { name: /Cs41 powder kit/i }));
    await user.click(screen.getByRole("button", { name: /Review plan/i }));

    const baseNow = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Start session/i }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Pause timer/i }));
    });

    const pausedPhaseText =
      container.querySelector(".phase-pill.is-current")?.textContent;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });

    expect(container.querySelector(".phase-pill.is-current")?.textContent).toBe(
      pausedPhaseText,
    );

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /End session/i }));
    });

    expect(screen.getByRole("status")).toHaveTextContent(/Session stopped/i);
    expect(container.querySelector(".phase-pill.is-current")?.textContent).toBe(
      pausedPhaseText,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });

    expect(container.querySelector(".phase-pill.is-current")?.textContent).toBe(
      pausedPhaseText,
    );
  }, 10000);

  it("shows a fullscreen notice when a session completes", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /Df96 monobath/i }));
    await user.click(screen.getByRole("button", { name: /Review plan/i }));

    const baseNow = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Start session/i }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(584_000);
    });

    expect(screen.getByRole("status")).toHaveTextContent(/Session complete/i);
    expect(
      screen.getByRole("button", { name: /Set up another session/i }),
    ).toHaveClass("primary-button", "cta-button");
  }, 10000);

  it("waits for manual confirmation before starting the next phase when pause-between-steps is enabled", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /^Settings$/i }));
    await user.click(
      screen.getByRole("button", { name: /Pause between steps/i }),
    );
    await user.click(screen.getByRole("button", { name: /^Recipes$/i }));

    await user.click(screen.getByRole("button", { name: /Cs41 powder kit/i }));
    await user.click(screen.getByRole("button", { name: /Review plan/i }));
    const baseNow = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Start session/i }));
    });
    expect(
      screen.getByRole("button", { name: /^Pause timer$/i }),
    ).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400_000);
    });

    expect(
      screen.getByRole("button", { name: /Begin next step/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/timer paused until you confirm/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Pause timer$/i }),
    ).not.toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Begin next step/i }));
    });

    expect(
      screen.getByRole("button", { name: /^Pause timer$/i }),
    ).toBeInTheDocument();
  }, 10000);

  it("opens the Mix tab and recalculates ratio math from pasted notation", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /^Mix$/i }));

    expect(
      screen.getByRole("heading", { name: /Mix calculator/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Dilute by ratio/i }));
    const ratioInput = screen.getByDisplayValue("1+31");
    await user.clear(ratioInput);
    await user.type(ratioInput, "30:50");

    expect(screen.getByText("187.5 ml")).toBeInTheDocument();
    expect(screen.getByText("312.5 ml")).toBeInTheDocument();
    expect(screen.getAllByText("500.0 ml").length).toBeGreaterThan(0);
  });

  it("surfaces HC-110 rescue guidance when the chosen dilution is too weak", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /HC-110/i }));

    await user.selectOptions(screen.getByLabelText(/Film format/i), "4x5");
    await user.clear(screen.getByLabelText(/Rolls or sheets/i));
    await user.type(screen.getByLabelText(/Rolls or sheets/i), "6");
    await user.selectOptions(screen.getByLabelText(/Dilution/i), "63");
    await user.clear(screen.getByLabelText(/Working solution volume/i));
    await user.type(screen.getByLabelText(/Working solution volume/i), "350");

    await user.click(screen.getByRole("button", { name: /Review plan/i }));

    expect(
      screen.getByRole("heading", { name: /HC-110 mix and capacity/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("6 sheets of 4x5")).toBeInTheDocument();
    expect(screen.getAllByText("120.0 in²").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Too dilute/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/B · 1\+31/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Minimum volume at 1\+63/i)).toBeInTheDocument();
    expect(screen.getByText("600 ml")).toBeInTheDocument();
  });

  it("shows the HC-110 dilution warning live during setup before plan review", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /HC-110/i }));

    await user.selectOptions(screen.getByLabelText(/Film format/i), "4x5");
    await user.clear(screen.getByLabelText(/Rolls or sheets/i));
    await user.type(screen.getByLabelText(/Rolls or sheets/i), "6");
    await user.selectOptions(screen.getByLabelText(/Dilution/i), "63");
    await user.clear(screen.getByLabelText(/Working solution volume/i));
    await user.type(screen.getByLabelText(/Working solution volume/i), "350");

    expect(
      screen.getByRole("heading", { name: /Too dilute right now/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Too dilute for this load\. At this volume, switch to B · 1\+31 or mix more working solution\./i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Minimum volume at 1\+63/i)).toBeInTheDocument();
    expect(screen.getByText("600 ml")).toBeInTheDocument();
  });

  it("lets the user return from review to setup with an in-page button", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /HC-110/i }));
    await user.click(screen.getByRole("button", { name: /Review plan/i }));
    await user.click(
      await screen.findByRole("button", { name: /Back to setup/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "HC-110" }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /Review plan/i }),
    ).toBeInTheDocument();
  });

  it("blocks unsupported DF96 combinations on the review screen", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /Df96 monobath/i }));
    await user.selectOptions(
      screen.getByLabelText(/Monobath temperature/i),
      "65",
    );

    const setupIssues = screen.getByRole("region", { name: /Setup issues/i });
    expect(
      within(setupIssues).getByRole("heading", {
        name: /Unsupported right now/i,
      }),
    ).toBeInTheDocument();
    expect(
      within(setupIssues).getByRole("button", { name: /Ignore/i }),
    ).toBeInTheDocument();

    await user.click(
      within(setupIssues).getByRole("button", { name: /Ignore/i }),
    );

    expect(
      screen.queryByRole("region", { name: /Setup issues/i }),
    ).not.toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText(/Monobath temperature/i),
      "70",
    );

    expect(
      screen.getByRole("region", { name: /Setup issues/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Review plan/i }));

    expect(await screen.findByText(/Start blocked/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Unsupported combo/i }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("region", { name: /Setup issues/i }),
    ).not.toBeInTheDocument();
  });

  it("shows DF96 workflow controls together and explains reuse units like Cs41", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /Df96 monobath/i }));

    expect(
      screen.getByText(
        /Choose the exact film family from the official Df96 chart\./i,
      ),
    ).toBeInTheDocument();

    const workflowHeading = screen.getByRole("heading", {
      name: /^Workflow$/i,
    });
    const workflowSection = workflowHeading.closest("section");
    if (!workflowSection) {
      throw new Error("Missing DF96 workflow section.");
    }

    expect(
      within(workflowSection).getByLabelText(/Monobath temperature/i),
    ).toBeInTheDocument();
    expect(
      within(workflowSection).getByLabelText(/Agitation method/i),
    ).toBeInTheDocument();

    const additionalOptionsHeading = screen.getByRole("heading", {
      name: /Additional options/i,
    });
    const additionalOptionsSection =
      additionalOptionsHeading.closest("section");
    if (!additionalOptionsSection) {
      throw new Error("Missing DF96 additional options section.");
    }

    expect(
      within(additionalOptionsSection).getByLabelText(
        /Extra time above minimum/i,
      ),
    ).toBeInTheDocument();
    expect(
      within(additionalOptionsSection).getByLabelText(/Archival wash method/i),
    ).toBeInTheDocument();
    expect(
      within(additionalOptionsSection).getByLabelText(/Drain before wash/i),
    ).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText(/Chemistry condition/i),
      "reused",
    );

    expect(
      screen.getByText(
        /1 unit = one 135 roll, one 120 roll, one 8x10 sheet, or four 4x5 sheets\./i,
      ),
    ).toBeInTheDocument();
  });

  it("pauses automatically for manual DF96 wash steps", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /Df96 monobath/i }));
    await user.selectOptions(
      screen.getByLabelText(/Archival wash method/i),
      "minimal",
    );
    await user.click(screen.getByRole("button", { name: /Review plan/i }));

    const baseNow = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Start session/i }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200_000);
    });

    expect(
      screen.getByRole("button", { name: /Complete this step/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/manual on purpose/i)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      /Minimal wash 5 inversions/i,
    );
  }, 10000);

  it("keeps DF96 constant-agitation cues active past the first 30 seconds", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /Df96 monobath/i }));
    await user.click(screen.getByRole("button", { name: /Review plan/i }));

    const baseNow = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Start session/i }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(41_000);
    });

    expect(
      screen.getByText(/Keep agitation moving in 29s/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/No more cues in this step/i),
    ).not.toBeInTheDocument();
  }, 10000);

  it("holds DF96 intermittent agitation on screen through the initial and minute-long cue windows", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /Df96 monobath/i }));
    await user.selectOptions(
      screen.getByLabelText(/Monobath temperature/i),
      "75",
    );
    await user.selectOptions(
      screen.getByLabelText(/Agitation method/i),
      "intermittent",
    );
    await user.click(screen.getByRole("button", { name: /Review plan/i }));

    const baseNow = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Start session/i }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(18_000);
    });

    expect(screen.getByText(/Right now/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Agitate continuously for 30 sec/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Prepare to agitate in/i),
    ).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(58_000);
    });

    expect(screen.getByText(/Agitate for 10 sec/i)).toBeInTheDocument();
    expect(screen.getByText(/4s left/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/Prepare to agitate in 26s/i),
    ).not.toBeInTheDocument();
  }, 10000);

  it("shows a fullscreen prepare notice and plays the generic voice prompt when DF96 enters the final 3-second agitation countdown", async () => {
    const user = userEvent.setup();
    const audioSpy = vi
      .spyOn(sessionAudio, "playToneSequence")
      .mockImplementation(() => undefined);
    const voiceSpy = vi
      .spyOn(sessionNotices, "playSessionNoticeVoice")
      .mockResolvedValue(undefined);

    resetClientStorage();
    storePreferences({
      speechPromptsEnabled: true,
      sessionStartCountdownSec: 0,
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Df96 monobath/i }));
    await user.selectOptions(
      screen.getByLabelText(/Monobath temperature/i),
      "75",
    );
    await user.selectOptions(
      screen.getByLabelText(/Agitation method/i),
      "intermittent",
    );
    await user.click(screen.getByRole("button", { name: /Review plan/i }));

    const baseNow = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Start session/i }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(66_000);
    });

    expect(screen.getByText(/Prepare to agitate in 1s/i)).toBeInTheDocument();

    const audioCallCountBeforePrepare = audioSpy.mock.calls.length;
    const voiceCallCountBeforePrepare = voiceSpy.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(screen.getByRole("status")).toHaveTextContent(/Prepare to agitate/i);
    expect(audioSpy.mock.calls).toHaveLength(audioCallCountBeforePrepare + 1);
    expect(audioSpy.mock.calls.at(-1)?.[0]).toEqual(["cue_soft"]);
    expect(voiceSpy.mock.calls).toHaveLength(voiceCallCountBeforePrepare + 1);
    expect(voiceSpy.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ id: "prepare_to_agitate" }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(screen.getByText(/Agitate for 10 sec in 2s/i)).toBeInTheDocument();
  }, 10000);

  it("shows a halfway keep-agitating notice during long timed agitation windows", async () => {
    const user = userEvent.setup();
    const audioSpy = vi
      .spyOn(sessionAudio, "playToneSequence")
      .mockImplementation(() => undefined);
    const voiceSpy = vi
      .spyOn(sessionNotices, "playSessionNoticeVoice")
      .mockResolvedValue(undefined);

    resetClientStorage();
    storePreferences({
      speechPromptsEnabled: true,
      sessionStartCountdownSec: 0,
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Df96 monobath/i }));
    await user.selectOptions(
      screen.getByLabelText(/Monobath temperature/i),
      "75",
    );
    await user.selectOptions(
      screen.getByLabelText(/Agitation method/i),
      "intermittent",
    );
    await user.click(screen.getByRole("button", { name: /Review plan/i }));

    const baseNow = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Start session/i }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(24_000);
    });

    const audioCallCountBeforeHalfway = audioSpy.mock.calls.length;
    const voiceCallCountBeforeHalfway = voiceSpy.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_500);
    });

    expect(screen.getByRole("status")).toHaveTextContent(/Halfway there/i);
    expect(audioSpy.mock.calls).toHaveLength(audioCallCountBeforeHalfway + 1);
    expect(audioSpy.mock.calls.at(-1)?.[0]).toEqual(["cue_soft"]);
    expect(voiceSpy.mock.calls).toHaveLength(voiceCallCountBeforeHalfway + 1);
    expect(voiceSpy.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ id: "keep_agitating_halfway" }),
    );
  }, 10000);

  it("does not emit per-second cue-pulse beeps during a DF96 agitation window", async () => {
    const user = userEvent.setup();
    const audioSpy = vi
      .spyOn(sessionAudio, "playToneSequence")
      .mockImplementation(() => undefined);

    render(<App />);

    await user.click(screen.getByRole("button", { name: /Df96 monobath/i }));
    await user.selectOptions(
      screen.getByLabelText(/Monobath temperature/i),
      "75",
    );
    await user.selectOptions(
      screen.getByLabelText(/Agitation method/i),
      "intermittent",
    );
    await user.click(screen.getByRole("button", { name: /Review plan/i }));

    const baseNow = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Start session/i }));
    });

    for (let index = 0; index < 5; index += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_000);
      });
    }

    const repeatedCueSoftCalls = audioSpy.mock.calls.filter(
      ([toneKinds]) => Array.isArray(toneKinds) && toneKinds[0] === "cue_soft",
    );

    expect(repeatedCueSoftCalls).toHaveLength(0);
  }, 10000);

  it("plays notice beeps and shows fullscreen notices when DF96 moves into drain and wash", async () => {
    const user = userEvent.setup();
    const audioSpy = vi
      .spyOn(sessionAudio, "playToneSequence")
      .mockImplementation(() => undefined);

    render(<App />);

    await user.click(screen.getByRole("button", { name: /Df96 monobath/i }));
    await user.click(screen.getByRole("button", { name: /Review plan/i }));

    const baseNow = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Start session/i }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(190_200);
    });

    expect(screen.getByRole("status")).toHaveTextContent(/Drain monobath/i);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.getByRole("status")).toHaveTextContent(/Pour wash water/i);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.getByRole("status")).toHaveTextContent(/^.*Wash.*$/i);

    expect(
      audioSpy.mock.calls.some(
        ([toneKinds]) =>
          Array.isArray(toneKinds) && toneKinds[0] === "drain",
      ),
    ).toBe(true);
    expect(
      audioSpy.mock.calls.some(
        ([toneKinds]) =>
          Array.isArray(toneKinds) && toneKinds[0] === "phase_start",
      ),
    ).toBe(true);
  }, 10000);

  it("shows fullscreen start and stop notices for timed agitation windows", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /Df96 monobath/i }));
    await user.selectOptions(
      screen.getByLabelText(/Monobath temperature/i),
      "75",
    );
    await user.selectOptions(
      screen.getByLabelText(/Agitation method/i),
      "intermittent",
    );
    await user.click(screen.getByRole("button", { name: /Review plan/i }));

    const baseNow = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Start session/i }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_200);
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      /Agitate continuously for 30 sec/i,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_500);
    });

    expect(screen.getByRole("status")).toHaveTextContent(/Stop agitation/i);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(29_500);
    });

    expect(screen.getByRole("status")).toHaveTextContent(/Agitate for 10 sec/i);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.getByRole("status")).toHaveTextContent(/Stop agitation/i);
  }, 10000);

  it("scrolls back to the top when switching screens", async () => {
    const user = userEvent.setup();
    const scrollToSpy = vi.mocked(window.scrollTo);

    render(<App />);

    await user.click(screen.getByRole("button", { name: /HC-110/i }));
    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalledWith({
        top: 0,
        left: 0,
        behavior: "auto",
      });
    });

    scrollToSpy.mockClear();

    await user.click(screen.getByRole("button", { name: /Review plan/i }));
    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalledWith({
        top: 0,
        left: 0,
        behavior: "auto",
      });
    });
  });

  it("rehydrates an in-progress session and asks for recovery confirmation", async () => {
    const user = userEvent.setup();
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_020_000);
    const recipeId = "kodak-hc110";
    const recipe = getRecipeById(recipeId);
    const plan = createSessionPlan(
      recipeId,
      createDefaultInputState(recipe),
      defaultAlertProfiles[0],
    );

    const session = startSession(
      createActiveSession(plan, 1_000_000),
      1_000_000,
    );
    saveActiveSessionSnapshot(plan, {
      ...session,
      lastPersistedAtMs: 1_000_000,
    });

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: /Recovered session/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Timing uncertainty: 20 sec\./i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Continue$/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^Pause timer$/i }),
      ).toBeInTheDocument();
    });

    nowSpy.mockRestore();
  });

  it("unlocks hidden debug tools after repeated header taps", async () => {
    const user = userEvent.setup();

    render(<App />);

    const brandButton = screen.getByRole("button", {
      name: /Film Dev/i,
    });

    for (let count = 0; count < 7; count += 1) {
      await user.click(brandButton);
    }

    expect(
      await screen.findByText(/Advanced diagnostics unlocked/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Settings$/i }));

    expect(
      await screen.findByRole("heading", { name: /Advanced diagnostics/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Refresh log/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Add breadcrumb/i }),
    ).toBeInTheDocument();
  });

  it("opens the About screen from the page footer link and shows the creator note", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /About this app/i }));

    expect(
      await screen.findByRole("heading", {
        name: /Who made this strange little thing/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /passionate film photographer who occasionally fustigates himself/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Codex and GPT-5.4/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /leonardofiori.it/i }),
    ).toBeInTheDocument();
  });
});
