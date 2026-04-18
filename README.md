# Film Dev

An offline-first darkroom companion for color and black-and-white film development.

## Official Repository
- GitHub: `https://github.com/iperrealistico/film-photo-dev.git`

## Current Status
- first runnable Vite + React + TypeScript build
- mobile-first UI with recipe browser, setup, plan review, session runtime, saved presets, chemistry batches, and settings
- sample source-labeled recipes for Cs41, HC-110, and Df96
- local persistence for preferences, active-session recovery, presets, and chemistry batches
- hidden IndexedDB-backed debug log with retention pruning, export tools, and runtime/lifecycle instrumentation
- automated QA now covers planner/runtime logic, app-flow integration, and service-worker registration behavior
- manifest + service worker foundation for PWA delivery
- GitHub Pages deployment workflow added for the public repository

## Scripts
- `npm install`
- `npm run dev`
- `npm run build`
- `npm test`
- `npm run test:watch`
- `npm run qa`

## Hosting
- Recommended first host: GitHub Pages
- Why: this app is a static Vite PWA with no backend, so Pages is enough and keeps the stack simpler than Vercel for the current scope.
- Live Pages URL: `https://iperrealistico.github.io/film-photo-dev/`
- Vercel is still a good future option if you later want preview deployments, server features, analytics, or other platform extras.

## Architecture
- `src/domain/`
  typed recipe, planning, and runtime logic
- `src/debug/`
  hidden forensic log model, logger, and local self-checks
- `src/ui/`
  mobile-first screens and session console
- `src/storage/`
  `localStorage`, IndexedDB wrappers, and hidden debug-log persistence
- `src/pwa/`
  service-worker registration
- `public/`
  manifest, service worker, and icon assets

## Notes
- This is the first vertical slice, not the final chemistry-authority release.
- The runtime and recovery model are implemented, but real-device darkroom validation is still needed before the app should be treated as production-trustworthy.
- Hidden debug tools can be unlocked from the app header with repeated taps or by loading the app with `?debug=1`.
- A QA pass on 2026-04-18 expanded automated coverage and fixed a paused-timer regression that caused elapsed time to drift backward after UI-only interactions.
- GitHub Pages is published from the `gh-pages` branch by `.github/workflows/deploy-pages.yml` after `npm run qa` and a repository-scoped production build.
- See [docs/app-creation-plan.md](/Users/leonardofiori/Documents/Codex/film-dev/docs/app-creation-plan.md) for the broader roadmap.
