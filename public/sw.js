const CACHE_NAME = 'film-dev-shell-v10';
const OFFLINE_URLS = [
  './',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/favicon-16.png',
  './icons/favicon.ico',
  './audio/notices/start-session.mp3',
  './audio/notices/starting-in-1.mp3',
  './audio/notices/starting-in-2.mp3',
  './audio/notices/starting-in-3.mp3',
  './audio/notices/starting-in-4.mp3',
  './audio/notices/starting-in-5.mp3',
  './audio/notices/starting-in-6.mp3',
  './audio/notices/starting-in-7.mp3',
  './audio/notices/starting-in-8.mp3',
  './audio/notices/starting-in-9.mp3',
  './audio/notices/starting-in-10.mp3',
  './audio/notices/session-complete.mp3',
  './audio/notices/session-stopped.mp3',
  './audio/notices/review-blocked.mp3',
  './audio/notices/recovered-session.mp3',
  './audio/notices/next-step-waiting.mp3',
  './audio/notices/invert-1.mp3',
  './audio/notices/invert-2.mp3',
  './audio/notices/invert-3.mp3',
  './audio/notices/invert-4.mp3',
  './audio/notices/invert-5.mp3',
  './audio/notices/invert-6.mp3',
  './audio/notices/invert-7.mp3',
  './audio/notices/invert-8.mp3',
  './audio/notices/invert-9.mp3',
  './audio/notices/invert-10.mp3',
  './audio/notices/start-continuous-agitation.mp3',
  './audio/notices/start-constant-agitation.mp3',
  './audio/notices/agitate-continuously-60-sec.mp3',
  './audio/notices/agitate-continuously-30-sec.mp3',
  './audio/notices/agitate-continuously-10-sec.mp3',
  './audio/notices/agitate-gently-for-10-sec.mp3',
  './audio/notices/agitate-for-10-sec.mp3',
  './audio/notices/agitate-15-sec.mp3',
  './audio/notices/agitate-gently-for-5-sec.mp3',
  './audio/notices/prepare-to-agitate.mp3',
  './audio/notices/keep-agitating-halfway.mp3',
  './audio/notices/stop-agitation.mp3',
  './audio/notices/pour-pre-soak-water.mp3',
  './audio/notices/drain-pre-soak.mp3',
  './audio/notices/pre-soak.mp3',
  './audio/notices/pour-developer.mp3',
  './audio/notices/developer.mp3',
  './audio/notices/transition-to-blix.mp3',
  './audio/notices/pour-blix.mp3',
  './audio/notices/blix.mp3',
  './audio/notices/drain-blix.mp3',
  './audio/notices/transition-to-wash.mp3',
  './audio/notices/drain-wash.mp3',
  './audio/notices/wash.mp3',
  './audio/notices/pour-final-rinse.mp3',
  './audio/notices/final-rinse.mp3',
  './audio/notices/drain-developer.mp3',
  './audio/notices/fill-stop-bath.mp3',
  './audio/notices/stop-bath.mp3',
  './audio/notices/drain-stop.mp3',
  './audio/notices/fill-fixer.mp3',
  './audio/notices/fixer.mp3',
  './audio/notices/drain-fixer.mp3',
  './audio/notices/drain-hypo-clear.mp3',
  './audio/notices/fill-hypo-clear.mp3',
  './audio/notices/hypo-clear.mp3',
  './audio/notices/fill-wash.mp3',
  './audio/notices/pour-wetting-agent.mp3',
  './audio/notices/wetting-agent.mp3',
  './audio/notices/pour-monobath.mp3',
  './audio/notices/monobath.mp3',
  './audio/notices/drain-monobath.mp3',
  './audio/notices/minimal-wash-5.mp3',
  './audio/notices/minimal-wash-10.mp3',
  './audio/notices/minimal-wash-20.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS)),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./') || caches.match('/')),
    );
    return;
  }

  if (new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        if (!response.ok) {
          return response;
        }

        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      });
    }),
  );
});
