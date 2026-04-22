// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { loadPreferences } from './preferences';

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

describe('preferences', () => {
  beforeEach(() => {
    const local = createMemoryStorage();

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: local
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: local
    });

    window.localStorage.clear();
  });

  it('defaults to White light mode when no preferences are stored', () => {
    expect(loadPreferences()).toMatchObject({
      themeMode: 'standard',
      animationsEnabled: true,
      buttonSoundsEnabled: true,
      speechPromptsEnabled: false,
      phaseConfirmationEnabled: false
    });
  });

  it('migrates the legacy red-safe boolean into the new theme mode model', () => {
    window.localStorage.setItem(
      'film-dev/preferences/v1',
      JSON.stringify({
        redSafeEnabled: true,
        leftHanded: true
      }),
    );

    expect(loadPreferences()).toMatchObject({
      themeMode: 'red_safe',
      leftHanded: true,
      animationsEnabled: true,
      buttonSoundsEnabled: true,
      speechPromptsEnabled: false,
      phaseConfirmationEnabled: false
    });
  });
});
