# Film Development PWA System Overview

This tracked document gives a repo-oriented overview of the workspace.
It intentionally stays lighter and less sensitive than the local-only dossier.

## Scope And Source Of Truth

- Use this file for the high-level architecture of the tracked codebase.
- Use `docs/reference/` for historical intent and archived context.
- Use `START-HERE-AI.local.md` and `documents-local/platform-dossier/` for current live-state, migration notes, incident history, and sensitive operational details.
- When this file and the local dossier differ, trust the local dossier for operational truth and record the divergence.

## Product/System Summary

- [Verified] The intended product is a progressive web app for film-photography enthusiasts who develop color and black-and-white film.
- [Verified] The app is expected to guide users through chemical preparation and process execution, including dilution guidance, agitation timing, drain points, and handoff between phases.
- [Verified] The initial chemistry scope described by the user includes CineStill Cs41 for color and CineStill DF96 or Kodak HC-110 plus generic stop, fix, hypo clear, rinse, bath, and wetting stages for black-and-white workflows.
- [Verified] The product must work online and offline.
- [Verified] A first implementation now exists as a static-first Vite + React + TypeScript PWA scaffold with local recipe data, offline service-worker support, local persistence, and a mobile-first darkroom UI shell.
- [Verified] The HC-110 planner now includes richer syrup/load guidance: total mix math, film-area conversion, dilution-capacity checks, and rescue recommendations when the selected dilution is too weak for the planned load.
- [Verified] The Cs41 planner now asks for previously processed roll-equivalent units, applies CineStill-style `+2%` developer extension per prior unit, and keeps blix fixed by default while offering an optional matching blix-extension fallback when the user wants it.
- [Verified] The app now also includes a dedicated `Mix` workspace for free-form chemistry calculations, with first-pass tools for bottle scaling, ratio dilution, multi-part chemistry scaling, and reverse “use what is left” math.
- [Verified] The settings area now includes local export actions for saved templates/presets and an all-local-data bundle.
- [Verified] The settings area now also includes persistent interaction controls for screen animations, button sounds, and optional manual phase confirmation between darkroom steps, and the app resets the view to the top when users switch screens so navigation stays clear on mobile.
- [Verified] The darkroom theming model now supports `standard`, `red_safe`, and a stricter `ultrared` mode, with `standard` selected by default and `ultrared` retained as the strongest black-and-red-only shell.
- [Verified] The UI now uses a local bundled SVG icon system in `src/ui/icons.tsx`, so iconography stays free, offline-safe, and available inside the installed PWA without any external font or CDN dependency.
- [Verified] The local QA surface now includes Vitest domain tests, JSDOM app-flow integration tests, service-worker tests, and manual Playwright-based browser verification.
- [Verified] The repository now includes a GitHub Pages deployment workflow for the official public GitHub repository.
- [Verified] The official public deployment is now live at `https://iperrealistico.github.io/film-photo-dev/`.

## Repository Map

- official Git repository
  - `https://github.com/iperrealistico/film-photo-dev.git`
- `package.json`
  - app manifest, scripts, and dependency declarations.
- `src/`
  - application code for the app shell, domain logic, UI, storage, and PWA hooks.
- `public/`
  - manifest, service worker, and icon assets for static/PWA delivery.
- `docs/`
  - tracked repo-facing documentation.
- `docs/reference/`
  - preserved source material such as the initial product brief.
- `documents-local/`
  - local-only control plane and operational memory.
- `.gitignore`
  - pre-created ignore rules to keep the local control plane out of a future Git repository.

## Main Components In The Current Workspace

- Git repository identity
  - the workspace is intended to use `https://github.com/iperrealistico/film-photo-dev.git` as its official upstream repository.
- Documentation bootstrap
  - tracked docs that capture the initial product brief and the current state.
- Local AI operations control plane
  - start-here guide, dossier, evidence store, board, logs, and notes.
- Application code
  - Vite + React + TypeScript client
  - typed domain schema and session-planning logic
  - typed chemistry-mix utility logic for ratio and scaling calculations
  - runtime timer and recovery behavior
  - `localStorage` and IndexedDB persistence layers
  - exported local JSON snapshots for presets and bundled local data
  - hidden forensic debug logging with retention pruning and export tooling
  - a local SVG icon library used across navigation, cards, headings, controls, and settings without online dependencies
  - automated QA coverage for runtime logic, app flows, and PWA registration
  - service-worker registration and manifest-driven PWA assets
  - GitHub Actions workflow for GitHub Pages deployment

## Known Live Or Runtime Divergence

- [Verified] A live GitHub Pages deployment now exists at `https://iperrealistico.github.io/film-photo-dev/`.
- [Verified] The production site is deployed from GitHub Actions using the official Pages artifact/deploy workflow, while development and release work continue from `main`.
- [Derived] The main divergence is therefore between local source/debug workflows on `main` and the static published build produced by the GitHub Pages deployment pipeline.

## Repository Identity

- [Verified] The official GitHub repository URL is `https://github.com/iperrealistico/film-photo-dev.git`.
- [Derived] The local workspace should keep that remote as canonical `origin` unless a future documented migration changes it.

## Developer Entry Points

1. Read `docs/reference/original-request/initial-product-brief.md` for the declared product scope.
2. Read `docs/system-overview.md` for the repo-facing summary.
3. Read `START-HERE-AI.local.md` if you are an AI operator and need the local control-plane workflow.
4. Read `documents-local/platform-dossier/01-overview-esecutiva.md` and `02-architettura-completa.md` for the deeper local dossier.

## Related Documentation

- `docs/README.md`
- `docs/app-creation-plan.md`
- `docs/reference/README.md`
- `docs/reference/original-request/initial-product-brief.md`
- `../START-HERE-AI.local.md`
- `../documents-local/platform-dossier/00-indice-maestro.md`
