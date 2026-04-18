# Legacy Single-Page App Feature Inventory

## Purpose
- [Verified] This document inventories the behavior, feature surface, data inputs, calculations, and workflow logic of two user-provided legacy single-page apps.
- [Derived] It is intentionally behavior-focused, not implementation-prescriptive.
- [Derived] The rebuild should preserve validated user value from these apps without inheriting their code structure, UI decisions, or unsupported assumptions.

## Source Files
- [Verified] Black-and-white helper source: `/Users/leonardofiori/Downloads/HC110DevCalc.html`
- [Verified] Color timer source: `/Users/leonardofiori/Documents/cs41-timer-fixed.html`
- [Verified] Supporting mirror used for easier inspection: `/Users/leonardofiori/Documents/Antigravity/film-dev-timers/`
- [Derived] The `film-dev-timers` mirror appears to be a refactor that externalized CSS and JS but preserved behavior.

## Important Caveats
- [Derived] The formulas, timings, and chemistry rules listed here are extracted from legacy UI text and code paths only. They are not yet chemistry-validated or provenance-backed.
- [Verified] Neither legacy app stores citations, recipe sources, or confidence labels.
- [Verified] Neither legacy app persists user state across reloads.
- [Derived] This inventory should be treated as a requirements-extraction document, not as scientific truth.

## Portfolio Summary

| App | Primary Goal | Core Strength | Major Gap |
| --- | --- | --- | --- |
| HC-110 B/W Helper | Calculate B/W developer mix and run a full multi-stage timer | Covers more of the full darkroom workflow | Narrow hardcoded film dataset, minimal settings, no provenance |
| CS41 Timer Pro | Calculate C-41 development/blix times and guide agitation | Richer alert/settings system | Only partially models the overall process and contains logic mismatches |

## Shared Legacy Patterns
- [Verified] Both apps are static, local-first, browser-only single-page tools.
- [Verified] Both apps are mobile-oriented and designed for use during an active darkroom process.
- [Verified] Both apps combine calculator behavior with a guided timer.
- [Verified] Both apps use audio cues and mobile vibration.
- [Verified] Both apps recompute outputs immediately when the user changes settings.
- [Verified] Both apps expose hardcoded recipe/options in JavaScript rather than a reusable data model.
- [Verified] Both apps lack persistence, saved presets, imports/exports, sharing, and user accounts.
- [Verified] Both apps lack a service worker, offline install surface, notifications, wake-lock handling, and background-safe timer guarantees.

## HC-110 B/W Helper

### Product Intent
- [Verified] The app presents itself as a "mobile-first calculator, timer and guide" for black-and-white development with Kodak HC-110.
- [Verified] It combines recipe selection, working-solution math, a capacity warning, and a process timeline/timer.

### Supported Film Data

| Film | Native ISO | Supported ISO options | Base time at 20 C |
| --- | --- | --- | --- |
| Ilford HP5+ | 400 | 400, 800, 1600 | 5:00, 7:30, 11:00 |
| Ilford FP4+ | 125 | 125, 50 | 8:00, 6:00 |
| Ilford Delta 100 | 100 | 100, 50, 200 | 6:00, 5:00, 8:00 |
| Fomapan 100 | 100 | 100, 50 | 6:00, 4:30 |
| Fomapan 200 | 200 | 200, 400 | 3:30, 7:00 |
| Fomapan 400 | 400 | 400, 320 | 7:00, 6:00 |

### Core User Inputs

| Input | Allowed values | Default | Notes |
| --- | --- | --- | --- |
| Film and ISO | Film table above | Ilford HP5+ at 400 | ISO picker shows push/pull label relative to native speed |
| HC-110 dilution | A 1+15, B 1+31, D 1+39, E 1+47, F 1+79, H 1+63 | B 1+31 | Treated as syrup-to-water working solution |
| Temperature | 18 C to 27 C, integer steps | 25 C | Used in development-time compensation |
| Agitation mode | Intermittent, Continuous | Intermittent | Continuous applies a time multiplier |
| Tank volume | 250, 300, 350, 400, 500, 600 ml | 350 ml | Used for mix calculation and capacity check |
| Format | 4x5, 5x7, 8x10, 135-36exp, 120 | 4x5 | Format maps to hardcoded area values |
| Quantity | 1 to 10 | 6 | Adjusted by stepper |
| Stop bath time | 0:15, 0:30, 0:45, 1:00 | 0:30 | Included in phase model |
| Fixer time | 3:00, 4:00, 5:00, 6:00, 8:00, 10:00 | 5:00 | Labeled as fresh fixer |
| Wash time | 5:00, 7:00, 10:00, 12:00 | 10:00 | Included in phase model |
| Hypo Clear enabled | On, Off | Off | Toggles extra phases |
| Hypo Clear time | 1:00, 2:00, 3:00 | 2:00 | Only used if Hypo Clear is enabled |
| Drain time | 5, 10, 15, 20 sec | 10 sec | Used for each drain step |
| Fill time | 5, 10, 15, 20 sec | 10 sec | Used for each fill step |
| Inversions per window | 2, 3, 4, 5, 6 | 4 | Used only for developer/fix agitation cue density |
| Warning lead | 2, 3, 4, 5 sec | 3 sec | Prepares the user before agitation windows |
| Stop/Fix beeps | On, Off | On | Enables beeps during stop/fix agitation |
| Sound | On, Off | On | Toggle in bottom action bar |

### Derived Labels And Calculations
- [Verified] Push/pull labels are derived from the selected ISO versus the film's native ISO.
- [Verified] The label rounds the exposure change to the nearest one-third stop.
- [Verified] Labels can render as `Native`, `Push +1`, `Push +1/3`, `Pull -2/3`, and similar variants.
- [Verified] Working-solution math uses `syrup = volume / (1 + dilutionRatio)` and `water = volume - syrup`.
- [Verified] The UI displays the exact syrup and water amounts in milliliters.
- [Verified] Capacity check uses hardcoded format areas:
  - `4x5 = 20 in²`
  - `5x7 = 35 in²`
  - `8x10 = 80 in²`
  - `135-36exp = 80 in²`
  - `120 = 80 in²`
- [Verified] Minimum syrup requirement is calculated as `area / 80 * 6 ml`.
- [Verified] Capacity badge states:
  - `Capacity OK` when margin is at least `2 ml`
  - `At the limit` when margin is between `0` and `< 2 ml`
  - `Too dilute` when margin is negative
- [Verified] Development time is computed from the selected film/ISO base time at `20 C`.
- [Verified] Temperature compensation uses `exp(-0.093 * (temp - 20))`.
- [Verified] Continuous agitation applies a multiplier of `0.85`.
- [Verified] Development time is clamped to a minimum of `180 seconds`.

### Process Model

| Order | Phase | Duration source | Special behavior |
| --- | --- | --- | --- |
| 1 | Developer | Calculated | Agitation guidance depends on agitation mode |
| 2 | Drain | Drain setting | No extra logic |
| 3 | Fill Stop | Fill setting | No extra logic |
| 4 | Stop bath | Stop setting | Optional recurring beeps every 5 seconds |
| 5 | Drain | Drain setting | No extra logic |
| 6 | Fill Fix | Fill setting | No extra logic |
| 7 | Fixer | Fix setting | First 30 seconds agitate, then intermittent-style windows |
| 8 | Drain | Drain setting | No extra logic |
| 9 | Fill Hypo | Fill setting | Only rendered when Hypo Clear is enabled |
| 10 | Hypo Clear | Hypo setting | Beep cue every 10 seconds |
| 11 | Drain | Drain setting | Only rendered when Hypo Clear is enabled |
| 12 | Fill Wash | Fill setting | No extra logic |
| 13 | Wash | Wash setting | No extra logic |
| 14 | Wetting agent (optional) | Fixed 60 seconds | Always rendered, despite being labeled optional |

### Agitation And Cue Logic
- [Verified] Intermittent developer agitation uses repeating 60-second windows.
- [Verified] During intermittent development, the app issues a `Prepare` cue `warning lead` seconds before the next window.
- [Verified] During the first 10 seconds of each intermittent window, the app spaces the requested inversion count across that 10-second range.
- [Verified] Inversion timing is approximated by `step = 10 / inversions` with each cue triggered at rounded second marks.
- [Verified] Continuous developer agitation does not prompt per inversion; it issues a `Continuous check` cue every 30 seconds.
- [Verified] Stop phase can emit `Stop agitate` cues every 5 seconds if `Stop/Fix beeps` is enabled.
- [Verified] Fix phase emits `Fix agitate` cues every 5 seconds for the first 30 seconds, then switches to intermittent-style minute windows.
- [Verified] Hypo Clear emits `Hypo agitate` every 10 seconds.
- [Verified] Major chemistry phases trigger vibration if the browser/device supports it.

### Timer And Interaction Behavior
- [Verified] The timeline is rebuilt whenever inputs change.
- [Verified] `Start` reuses the current settings, activates the first phase, and starts a one-second timer loop.
- [Verified] `Pause` toggles between paused and resumed state without clearing the session.
- [Verified] `Reset` clears the running timer, removes active/flash/cue state, and rebuilds the timeline from current settings.
- [Verified] Each phase card shows a local progress bar.
- [Verified] Active phases are highlighted in the phase list.
- [Verified] Cues are shown inside the active phase card as transient chips such as `Prepare`, `Agitate 3`, or the phase name.
- [Verified] The bottom action bar contains `Sound`, `Start`, and `Pause`.
- [Verified] Input selection uses a bottom-sheet modal with tappable options.
- [Verified] Film selection is two-step: choose a film, then choose one of its supported ISO values.
- [Verified] The app runs a small self-test suite through `console.assert` when it loads.

### Observed Limitations And Quirks
- [Verified] Film support is limited to six hardcoded films and a small set of ISO variants.
- [Verified] There is no way to enter a custom film, ISO, dilution, or time.
- [Verified] The wetting-agent phase is always present even though its label says optional.
- [Verified] There is no separate toggle for vibration; `Sound Off` does not disable vibration cues.
- [Verified] There is no persistence for settings or session state.
- [Verified] There is no final completion screen that stays visible; the app resets immediately after the last phase.
- [Verified] There is no provenance layer for the film times, dilution guidance, or capacity formula.

## CS41 Timer Pro

### Product Intent
- [Verified] The app presents itself as a professional C-41 film development timer.
- [Verified] Its focus is narrower than the HC-110 app: it calculates developer and blix timing, guides agitation, and leaves wash/stabilizer as post-process instructions rather than timed phases.

### Core User Inputs

| Input | Allowed values | Default | Notes |
| --- | --- | --- | --- |
| Developer temperature | 72, 80, 85, 90, 95, 102 F | 102 F | Stored in Fahrenheit; UI also shows Celsius equivalent |
| Processing mode | Standard, Push/Pull | Standard | Push/Pull selection is disabled below 85 F |
| Push/Pull adjustment | -1, +1, +2, +3 | Hidden until enabled, then +1 | Zero is not selectable once push/pull mode is active |
| Developer type | Fresh Chemistry, Reused Chemistry | Fresh | Changes whether reuse fields are shown |
| Solution volume | Pint 473 ml, Quart 946 ml, Gallon 3785 ml | Quart | Only used for reused chemistry compensation |
| Films previously processed | 1 to 50 | 1 | Only used for reused chemistry compensation |
| Agitation mode | Intermittent, Continuous | Intermittent | Continuous changes guidance only, not time |
| Sound volume | 0 to 100 percent | 30 percent | Audio system volume |
| Phase transition delay | 5 to 30 seconds | 10 seconds | Delay between development and blix |
| Inversion sound interval | 1 to 5 seconds, step 0.5 | 2 seconds | Spacing inside an inversion series |
| Sound theme | Modern, Classic, Minimal | Modern | Changes oscillator patterns |
| Visual effects | On, Off | On | Controls timer flash animations |
| Vibration | On, Off | On | Mobile vibration toggle |
| Click sounds | On, Off | On | UI tap feedback toggle |
| Darkroom mode | On, Off | Off | Changes the theme to a safelight-style red mode |
| Number of inversions | 1 to 10 | 4 | Used for each inversion series |
| Blix mode | Fixed, Dynamic | Fixed | Dynamic uses chemistry-age compensation |
| Blix time | Numeric minutes | 8.0 min | Used directly in fixed mode and as the dynamic base |

### Base Development Times

| Temperature | Base development time |
| --- | --- |
| 72 F | 50.0 min |
| 80 F | 21.0 min |
| 85 F | 13.0 min |
| 90 F | 8.5 min |
| 95 F | 5.75 min |
| 102 F | 3.5 min |

### Calculation Rules
- [Verified] Standard mode uses the base time from the temperature table.
- [Verified] Push/Pull mode applies only when temperature is between `85 F` and `102 F` inclusive.
- [Verified] Push/Pull multiplier is `1 + 0.3 * stops`.
- [Verified] Reused chemistry compensation depends on solution volume:
  - `pint = +4.0 percent per previously processed film`
  - `quart = +2.0 percent per previously processed film`
  - `gallon = +0.5 percent per previously processed film`
- [Verified] Development time is `baseTime * pushPullMultiplier * reuseMultiplier`.
- [Verified] Dynamic blix time does not mirror the full development formula.
- [Verified] Dynamic blix uses only the reuse multiplier applied to the entered blix-time value.
- [Verified] The explanation box shows:
  - selected temperature in F and converted C
  - base time
  - push/pull explanation when active
  - reused-chemistry explanation when active
  - final development time
  - blix time
  - agitation guidance text for intermittent mode

### Agitation Guidance Model
- [Verified] Intermittent mode always starts with an immediate inversion series shortly after phase start.
- [Verified] The number of inversions in a series is user-configurable.
- [Verified] The gap between inversion beeps inside a series is user-configurable.
- [Verified] Each future inversion series is pre-announced 3 seconds early with `PREPARE FOR INVERSION`.
- [Verified] For development, the timer chooses temperature-band scheduling:
  - `72 to 80 F`: initial delay `60 sec`, repeat interval `120 sec`
  - `85 to 90 F`: initial delay `30 sec`, repeat interval `60 sec`
  - `95 to 102 F`: initial delay `10 sec`, repeat interval `30 sec`
- [Verified] For blix, the timer always uses an initial delay of `10 sec` and a repeat interval of `30 sec`.
- [Verified] Continuous agitation mode suppresses inversion scheduling.
- [Verified] Continuous agitation does not automatically alter phase timing.

### Actual Process Model

| Order | Phase | Duration source | Special behavior |
| --- | --- | --- | --- |
| 1 | Development | Calculated development time | Agitation alerts only in intermittent mode |
| 2 | Transition to blix | Phase-delay setting | Countdown label only |
| 3 | Blix | Fixed or dynamic blix time | Uses same timer shell and can also schedule intermittent inversions |
| 4 | Completion message | No duration | Instructs user to proceed with wash and stabilizer rinse |

### Timer And Interaction Behavior
- [Verified] Starting the process updates the explanation box, computes development time, starts the timer, and scrolls to the timer panel.
- [Verified] The main timer view shows phase label, time remaining, inversion/status message, and progress bar.
- [Verified] The `Pause` button becomes `Resume` while paused.
- [Verified] Pause attempts to preserve the phase start timestamp and restart inversion scheduling on resume.
- [Verified] `Stop` clears active timers, plays a stop sound, and reloads the page.
- [Verified] The completion state remains on screen instead of immediately resetting.
- [Verified] A slide-in settings panel contains all advanced controls.
- [Verified] Custom dropdown widgets are used instead of native selects for temperature, processing mode, and solution volume.
- [Verified] The app supports three sound themes with different oscillator patterns.
- [Verified] The app uses visual flash states on the timer display for start, prepare, inversion, phase change, and end.
- [Verified] Darkroom mode recolors the UI to a deep red palette.
- [Verified] The app uses vibration patterns for phase changes, inversions, pause/resume, stop, and prepare cues when enabled.
- [Verified] The app displays a countdown message such as `Next inversion in X seconds...` between inversion series when applicable.

### Observed Limitations And Quirks
- [Verified] The app does not model the full C-41 process; wash and stabilizer are only mentioned in the final message.
- [Verified] There is no mix calculator for developer, blix, wash, or stabilizer.
- [Verified] There is no film-stock selection or per-film recipe variation.
- [Verified] Push/Pull mode cannot represent a neutral `0 stop` state once enabled.
- [Verified] `Dynamic` blix is labeled as if it behaves like developer timing, but it only applies chemistry-age compensation.
- [Verified] Continuous agitation is labeled as an alternative but does not change timing automatically.
- [Verified] `Stop` is implemented as a full page reload instead of a local reset.
- [Verified] The app does not persist settings across reloads.
- [Derived] The intermittent-agitation explanation text and the actual scheduling behavior are not fully aligned:
  - the explanation says `every 120s`, `every 60s`, or `every 30s`
  - the code schedules the first later inversion series after `initial delay + repeat interval`, which means the first repeat lands at approximately `180s`, `90s`, or `40s` from phase start depending on temperature band
- [Verified] There is no provenance layer for the base temperature table or reuse-compensation formula.

## Cross-App Feature Matrix

| Capability | HC-110 B/W Helper | CS41 Timer Pro |
| --- | --- | --- |
| Film-stock selection | Yes, limited hardcoded list | No |
| Exposure-rating / push-pull handling | Yes, implicit via ISO choices | Yes, explicit push/pull control |
| Developer dilution selector | Yes | No |
| Working-solution mix calculator | Yes | No |
| Capacity / exhaustion warning | Yes | No |
| Temperature-compensated development time | Yes | Yes |
| Chemistry age / reuse compensation | No | Yes |
| Full multi-stage timed workflow | Yes | No |
| Fill and drain stage modeling | Yes | No |
| Optional Hypo Clear stage | Yes | No equivalent |
| Wetting stage handling | Yes, fixed 60s | No |
| Blix phase | No | Yes |
| Wash/stabilizer timing | Wash yes, stabilizer no | No, post-process text only |
| Agitation guidance during timer | Yes | Yes |
| Visual timer effects | Minimal | Yes |
| Sound theme choices | No | Yes |
| Darkroom safelight mode | No explicit mode | Yes |
| Pause/resume | Yes | Yes |
| Final completion hold state | No | Yes |
| Persistence / saved presets | No | No |
| Provenance / citations | No | No |

## Unified Rebuild Implications

### Capabilities Worth Preserving
- [Derived] The rebuild should keep the hybrid model of `calculator + guided session timer`.
- [Derived] The rebuild should preserve multi-phase process modeling from the HC-110 app.
- [Derived] The rebuild should preserve the richer alert/settings surface from the CS41 app.
- [Derived] The rebuild should preserve explicit agitation guidance rather than only presenting total phase durations.
- [Derived] The rebuild should preserve chemistry-prep support such as mix and capacity calculations where relevant.

### Legacy Inconsistencies To Normalize
- [Derived] Temperature units are split between Celsius and Fahrenheit and need a single normalized strategy with optional display conversion.
- [Derived] One app models full workflows while the other models only part of the process; the new app needs one shared workflow engine.
- [Derived] Alert settings are asymmetric; the new app should use one common alert/preferences model.
- [Derived] Reset behavior is inconsistent; the new app should reset state without destructive page reloads.
- [Derived] Data structures are hardcoded and app-specific; the new app needs a recipe/session domain model instead of per-page logic.

### Missing Capabilities That The Rebuild Should Add
- [Derived] Evidence-backed recipe provenance for every supported chemistry rule and timing table.
- [Derived] Persisted presets, recent sessions, and last-used settings.
- [Derived] Offline-safe timer behavior with explicit handling for backgrounding, sleep, tab throttling, and wake lock.
- [Derived] Strong validation and safety language around unsupported combinations.
- [Derived] A common phase builder that can represent developer, blix, stop, fix, wash, hypo, wetting agent, stabilizer, and rinse stages consistently.
- [Derived] A data model that separates:
  - recipe facts
  - user/session inputs
  - computed outputs
  - timer-phase execution state

## Recommended Use Of This Document
- [Derived] Use this file as the legacy behavior inventory during product and architecture planning.
- [Derived] Do not use it as the chemistry evidence source.
- [Derived] When a future rebuild disagrees with legacy behavior, the mismatch should be treated as a deliberate product decision and documented explicitly.
