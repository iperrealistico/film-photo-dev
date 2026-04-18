// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

const logDebugEvent = vi.fn();

vi.mock('../debug/logging', () => ({
  logDebugEvent
}));

describe('registerServiceWorker', () => {
  beforeEach(() => {
    logDebugEvent.mockReset();
  });

  it('logs a warning when service workers are unavailable', async () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      Navigator.prototype,
      'serviceWorker',
    );

    delete (Navigator.prototype as { serviceWorker?: unknown }).serviceWorker;

    const { registerServiceWorker } = await import('./registerServiceWorker');

    registerServiceWorker();

    expect(logDebugEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warn',
        category: 'pwa',
        event: 'service_worker_unsupported'
      }),
    );

    if (originalDescriptor) {
      Object.defineProperty(Navigator.prototype, 'serviceWorker', originalDescriptor);
    }
  });

  it('registers the service worker after window load', async () => {
    const register = vi.fn().mockResolvedValue({ scope: 'http://localhost:4173/' });

    Object.defineProperty(Navigator.prototype, 'serviceWorker', {
      configurable: true,
      value: {
        register
      }
    });

    const { registerServiceWorker } = await import('./registerServiceWorker');

    registerServiceWorker();
    window.dispatchEvent(new Event('load'));
    await Promise.resolve();

    expect(register).toHaveBeenCalledWith('/sw.js');
    expect(logDebugEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'pwa',
        event: 'service_worker_registered'
      }),
    );
  });
});
