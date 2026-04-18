import { logDebugEvent } from '../debug/logging';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    logDebugEvent({
      level: 'warn',
      category: 'pwa',
      event: 'service_worker_unsupported'
    });
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((registration) => {
        logDebugEvent({
          category: 'pwa',
          event: 'service_worker_registered',
          detail: {
            scope: registration.scope
          }
        });
      })
      .catch((error) => {
        logDebugEvent({
          level: 'error',
          category: 'pwa',
          event: 'service_worker_registration_failed',
          detail: { error }
        });
      });
  });
}
