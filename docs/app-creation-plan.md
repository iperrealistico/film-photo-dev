# Film Development PWA Creation Plan

## Purpose
This document turns the current product discussions into a detailed execution plan for the first real build of the app.

It reflects the current constraints and goals:
- the app should be a free open-source static PWA;
- it should run on GitHub Pages with no backend;
- it should install and work offline on iPhone and Android;
- it should support both color and black-and-white workflows in one shared product;
- it should be designed first for real darkroom use, not for demo screenshots;
- it should preserve the genuinely useful ideas from the legacy apps without inheriting their code or structural problems.

## What Changed In This Revision
This revision does three things that the earlier plan did not do explicitly enough:
- it compares the new plan directly against the two legacy single-file apps;
- it restores the best legacy ideas that were at risk of being forgotten;
- it expands the plan much further in UX, stability, debugging, data, and delivery detail so implementation can start from a stronger product definition.

## Product Goal
Build a professional offline-first darkroom companion that helps photographers:
- choose a supported recipe with visible provenance;
- prepare chemistry correctly;
- understand where the timing and mix values come from;
- run a guided multi-phase session with reliable cues and recovery;
- save presets, chemistry batches, and session history locally on device.

The product should be especially strong for a person developing film alone, with wet hands, partial attention, limited light, and no desire to do mental arithmetic while chemicals are already in motion.

## Product Success Bar
The app is successful only if it becomes trustworthy as a working tool, not just an attractive calculator.

That means:
- the timer feels dependable even after interruption;
- the runtime interface reduces stress instead of increasing it;
- the app explains recipe source confidence clearly;
- common solo-developer mistakes are prevented earlier in the flow;
- the codebase stays simple enough that open-source contributors can understand it.

## Direct Comparison Against The Legacy Apps

### What The HC-110 Legacy App Did Well
The HC-110 app was rough, but it had a few genuinely strong product instincts:
- it modeled more of the full workflow instead of only the headline developer time;
- it treated drain and fill steps as real parts of the process;
- it exposed chemistry mix math directly and visibly;
- it warned when the working dilution was too weak for the chosen film quantity and format;
- it rebuilt the full process timeline as inputs changed;
- it included useful user-tunable timing knobs such as warning lead, inversion count, drain time, and fill time;
- it had a small self-test habit through startup `console.assert` checks.

### What The CS41 Legacy App Did Well
The CS41 app was narrower, but it had a better sense of runtime usability:
- it exposed richer alert settings;
- it had explicit sound, vibration, click-sound, and visual-effects controls;
- it supported multiple sound themes;
- it showed a live `next inversion in X seconds` style countdown;
- it kept the completion state visible instead of immediately resetting;
- it made darkroom mode a visible feature instead of an afterthought;
- it gave the timer more personality and runtime feedback than the HC-110 app.

### What The Earlier Plan Under-Specified
The earlier plan already captured the broad direction well, but after comparing it back to the legacy inventory, several valuable behaviors needed to be made explicit:
- pre-start timeline preview;
- explicit capacity and exhaustion guardrails for applicable chemistries;
- cue customization at a finer grain;
- persistent end-of-session summary instead of immediate reset;
- always-visible next-action or next-cue countdown during active phases;
- built-in formula and recipe validation habits instead of relying only on manual inspection.

### Legacy Strengths We Should Preserve Deliberately
These are not just nostalgic details. They are product behaviors that reduced confusion or prevented mistakes.

| Legacy strength | Why it mattered | New plan commitment |
| --- | --- | --- |
| Full timeline preview before start | Reduced cognitive load before chemistry touched film | Add a dedicated `Mix And Plan` review screen with phase list, total duration, and step transitions |
| Capacity badge / dilution safety check | Prevented using too little developer for the loaded tank | Add chemistry-specific `capacity and exhaustion` validation as a first-class feature |
| Fine-grained cue settings | Let the timer match personal working style | Add `alert profiles` plus advanced per-recipe cue tuning where safe |
| Next inversion countdown | Reduced uncertainty between agitation series | Add a persistent `next cue` region to the session screen |
| Persistent completion state | Helped users finish calmly and review what happened | Add a `Completion And Notes` screen with summary and post-session logging |
| Load-time self-tests | Caught regressions early in a messy codebase | Add build-time and startup validation harnesses for formulas, recipe data, and storage migrations |

### Conclusion Of The Comparison
We are not missing a hidden giant feature category from the legacy apps, but we were under-describing a handful of strong ideas that deserve to survive. The right synthesis is:
- preserve the HC-110 app's workflow completeness and chemistry guardrails;
- preserve the CS41 app's runtime feedback and alert customization;
- rebuild both inside a more rigorous, source-aware, testable system.

## Product Principles
These principles should guide feature decisions when tradeoffs appear.

### 1. Timer Trust Beats Feature Count
If a feature makes the timer less reliable, more ambiguous, or harder to recover, it should be cut, postponed, or redesigned.

### 2. Setup Can Be Rich, Runtime Must Be Simple
Before the session starts, the user can browse, compare, review, and customize.
Once the session starts, the UI should collapse into a calm control surface with very few visible decisions.

### 3. No Silent Chemistry Magic
If a time, mix, or warning comes from a source, the source should be visible.
If a value is derived by app logic, the calculation path should be explainable.
If a combination is unsupported, the app should say so clearly.

### 4. Workflow Matters More Than Raw Time Tables
A useful darkroom app is not only a data sheet.
It must help with preparation, transitions, recovery, and the real-world awkward parts of actually using chemistry.

### 5. The App Must Help A Solo Operator
Assume the user has only one person, one phone, one pair of wet hands, and very little spare attention.

### 6. Offline Is A Core Capability, Not A Nice-To-Have
The app should still be useful without network, after installation, and after a prior successful cache.

### 7. Support More Chemistry Through Data, Not Through Special-Case UI
The app should scale by using recipe definitions, input definitions, and phase models, not by adding hardcoded app branches for every new developer.

### 8. Runtime Should Record Reality, Not Pretend Reality
If the user missed a cue or paused mid-process, the app should record the deviation and help recover rather than pretending the ideal plan still happened.

### 9. Every Important Risk Needs An Engineering Countermeasure
The plan should not just list scary problems. It should specify how the architecture will defend against them.

### 10. Open-Source Maintainability Matters
The codebase should be obvious to read, typed, modular, and testable without a server or a large dependency pile.

## Real User Constraints
The design should assume all of the following are normal:
- the user may be standing, moving, and juggling bottles;
- the user's fingers may be wet, slippery, or gloved;
- the room may be dark or safelight-lit;
- the phone may get locked, backgrounded, dimmed, or splashed;
- the user may only glance at the screen for a second at a time;
- the user may trust official chemistry sources more than community data;
- the user may want a reusable personal preset once they find a workflow that works.

## V1 Scope

### V1 Must Deliver
- source-backed recipe selection;
- chemistry-specific setup forms;
- visible calculation breakdown for supported workflows;
- mix calculations where applicable;
- guided multi-phase timer;
- one-handed darkroom runtime interface;
- red-safe mode;
- saved presets;
- chemistry batch tracking;
- interruption recovery;
- installable offline PWA behavior.

### V1 Should Try To Deliver If It Fits Cleanly
- rehearsal mode;
- tank and bottle profiles;
- post-session notes;
- delayed start and prewarm countdown;
- richer lead prompts and cue customization;
- left-handed or right-handed runtime layout preference.

### Out Of Scope For Strict V1
- accounts or cloud sync;
- online recipe submission;
- server APIs;
- every possible developer on day one;
- automatic import of third-party community data at runtime;
- unverified chemistry advice presented as authoritative;
- advanced analytics or social features.

## Feature Architecture
The app should be designed as several capability layers that stay clearly separated.

### 1. Source Layer
Stores provenance, confidence, citations, authoring notes, and access dates.

### 2. Recipe Layer
Defines supported inputs, calculations, warnings, phase lists, agitation rules, and chemistry-specific options.

### 3. Session Planning Layer
Turns a chosen recipe plus user inputs into a concrete session plan with absolute durations, alerts, and expected transitions.

### 4. Runtime Layer
Executes the session plan, tracks real elapsed time, handles pause and resume, and records actual user acknowledgements and deviations.

### 5. Persistence Layer
Stores preferences, presets, chemistry batches, history, active-session snapshots, and debug traces locally.

### 6. Diagnostics Layer
Surfaces version info, validation state, recovery status, debug exports, and failure context without requiring a backend.

## Recovered And Expanded Feature Set

### Features Explicitly Restored From The Legacy Apps
- pre-start phase timeline preview;
- developer capacity and exhaustion warnings where chemistry rules allow them;
- cue lead-time settings;
- user-selectable inversion count and inversion pacing where the recipe supports it;
- separate sound, vibration, and visual cue preferences;
- persistent completion screen;
- visible `next cue` countdown between agitation windows;
- explicit transition phases rather than invisible jumps;
- startup validation checks for recipe and math integrity.

### New Features That Go Beyond The Legacy Apps
- visible provenance and confidence labels for every supported recipe;
- saved presets and recent sessions;
- chemistry batch lifecycle tracking;
- unsupported-combination blocking;
- interruption and recovery flow;
- rehearsal mode;
- post-session deviation notes;
- exportable diagnostics and future-ready local data structure;
- service-worker-aware update safety;
- developer-family data model for adding more chemistry without UI collapse.

## UX Plan

### Overall UX Direction
The app should feel like a darkroom instrument rather than a generic website form.

The user experience should split cleanly into modes:
- `Browse` for recipe discovery and selection;
- `Setup` for input collection and calculation review;
- `Mix And Plan` for chemistry prep and timeline preview;
- `Session` for active darkroom use;
- `Recovery` when an interruption occurred;
- `Completion` for summary and notes;
- `Chemistry` for inventory and batch tracking;
- `Saved` for presets and recent sessions;
- `Settings` for alert behavior, red-safe defaults, handedness, and install help.

### Screen Map

#### Recipes
Purpose:
- choose between color and black-and-white;
- browse supported chemistries;
- search, filter, and favorite recipes.

Must contain:
- prominent `Color` and `B&W` entry points;
- chemistry cards with source badges;
- a confidence label such as `Official`, `Curated`, `Community`, or `Custom`;
- favorite and recent markers;
- a quick path into saved presets.

#### Setup
Purpose:
- collect only the inputs relevant to the selected recipe.

Must contain:
- chemistry-specific form controls;
- large full-width selectors or bottom sheets;
- inline warnings before the user reaches the session;
- a `Why this matters` explanation for unusual inputs;
- a `Why this time?` breakdown region.

#### Mix And Plan
Purpose:
- convert the chosen recipe into a concrete real-world prep checklist.

Must contain:
- exact chemistry amounts;
- tank and bottle assumptions;
- capacity and exhaustion result;
- total session duration;
- ordered phase timeline;
- risky transition flags;
- a pre-session readiness checklist;
- delayed-start options.

This is the screen that most directly restores the best planning behavior from the HC-110 app and improves it significantly.

#### Session
Purpose:
- run the active process with as little cognitive load as possible.

Must contain:
- large phase name;
- giant time remaining;
- current action text;
- next action or next cue countdown;
- one primary control;
- at most two always-visible secondary controls;
- sticky bottom action area within thumb reach;
- a `More` sheet for low-frequency actions.

#### Recovery
Purpose:
- help the user safely continue after interruption, suspension, reload, or uncertainty.

Must contain:
- what phase the app believes was active;
- how much time appears to have elapsed;
- what is known versus uncertain;
- options to continue, adjust, or mark a deviation;
- no false precision.

#### Completion
Purpose:
- provide closure and record what happened.

Must contain:
- final session summary;
- chemistry usage update;
- quick note fields for temperature, agitation, delays, and results;
- shortcut to save or update a preset;
- option to begin a related session again.

#### Chemistry
Purpose:
- manage mixed solutions and their status over time.

Must contain:
- batch age;
- last-used date;
- estimated remaining capacity;
- warnings about freshness or depletion;
- quick link to use an existing batch in a new session.

#### Saved
Purpose:
- reduce setup friction for repeat workflows.

Must contain:
- saved presets;
- recent sessions;
- copied presets;
- personal favorites;
- last-used alert profile.

### One-Handed And Wet-Handed Design Rules
The runtime interface should assume the user is not delicately tapping a dry phone while seated at a desk.

Rules:
- keep primary controls in the lower half of the screen;
- use large touch targets, ideally `64px` or larger;
- avoid tiny icons as the only target;
- use full-width buttons or cards in critical flows;
- prefer bottom sheets over compact dropdowns;
- require press-and-hold for destructive actions such as stop, skip, or reset;
- keep spacing generous to prevent wet-finger mis-taps;
- allow a `left hand` and `right hand` layout preference if it fits cleanly;
- show strong text labels, not icon-only controls, during runtime.

### Red-Safe Mode
Red-safe mode should be treated as a real operating mode, not just a theme toggle.

Requirements:
- near-black background;
- dim deep-red foreground palette;
- no bright white surfaces in active runtime mode;
- no reliance on color alone for status;
- reduced animation and low overall brightness;
- available globally and also as a quick toggle before session start;
- optional `auto-enable in darkroom mode`;
- readable under dim conditions without needing full screen brightness.

### Alert And Feedback Strategy
The legacy CS41 app was right to make alerts configurable. The new app should keep that strength but structure it more clearly.

The alert system should support:
- separate audio, vibration, and visual cue toggles;
- alert profiles such as `Loud`, `Quiet`, `Vibration-first`, `Red-safe only`;
- sound theme selection only if it stays small and tasteful;
- inversion pacing configuration where the chemistry model allows it;
- cue lead-time configuration;
- repeat cue action for missed prompts;
- safe defaults per chemistry.

### Session Runtime Information Hierarchy
At any moment during a session, the user should be able to tell:
- what phase they are in;
- how much time is left;
- what they need to do right now;
- what happens next;
- whether the timer state is healthy or recovering.

Everything else is secondary.

### Recovery UX
Recovery must be visible, honest, and calm.

If an interruption happened:
- do not resume silently as if nothing happened;
- explain what the app inferred from timestamps;
- show elapsed time since last confirmed state;
- allow the user to log what actually happened;
- keep the interface usable even if confidence is partial.

### Completion UX
The new app should never just snap back to idle after the last phase.

The completion flow should:
- stay on screen;
- summarize planned versus actual duration;
- show chemistry usage updates;
- invite short notes;
- let the user save a variant preset if they changed something.

## Scaling To Many Developers Without UX Collapse
Supporting more chemistry should not mean turning the UI into one giant universal settings screen.

The product should scale through recipe families.

### Suggested Recipe Families
- one-shot concentrate developer with dilution ratio;
- stock developer with optional dilutions;
- monobath;
- multi-bath black-and-white process;
- color kit with temperature chart and reuse rules;
- generic timed bath;
- generic untimed instruction step.

### Why This Matters
This approach allows:
- HC-110, Rodinal, Ilfotec, and similar developers to share patterns;
- Cs41 and similar kits to share a color-kit model;
- DF96 and other monobaths to have simpler setup;
- future chemistry support to expand by data entry instead of major UI rewrites.

## Data And Source Plan

### Source Hierarchy
Each recipe entry should be labeled as one of:
- `Official`
- `Manufacturer`
- `Curated`
- `Community`
- `Custom`

Each recipe should also store:
- title of the source;
- publisher or author;
- link or offline citation note;
- date accessed or imported;
- extraction notes;
- chemistry-specific caveats.

### B&W Source Strategy
For black-and-white:
- the Massive Dev Chart can be used as a broad discovery source;
- official manufacturer documentation should override it where available;
- community or mixed-source entries should never look identical to official data;
- unsupported or ambiguous combinations should be blocked or clearly caveated.

### Color Source Strategy
For color:
- use CineStill documentation as primary authority for Cs41;
- attach explicit source text references or extracted table provenance;
- reuse rules, push/pull behavior, and temperature charts must follow the cited documentation, not memory.

### Recipe Data Requirements
Every recipe should be able to express:
- supported inputs;
- defaults;
- calculation rules;
- optional or conditional phases;
- agitation behavior;
- warning rules;
- capacity rules if applicable;
- reuse rules if applicable;
- source and confidence metadata;
- human-readable explanation strings.

### Data Validation Requirements
Before a recipe is bundled into the app, validation should check:
- schema correctness;
- required source metadata present;
- no contradictory flags;
- time and quantity units are explicit;
- all derived formulas compile or pass tests;
- unsupported combinations are represented intentionally rather than by omission.

## Technical Architecture

### Stack
- Vite
- TypeScript
- single-page app
- plain CSS
- static JSON or TypeScript data modules for bundled recipe/source data
- `localStorage` for simple preferences
- `IndexedDB` for structured local records
- GitHub Actions for build and Pages deployment
- service worker plus manifest for offline install behavior

### Why This Stack
It fits the product shape:
- static hosting;
- no backend;
- professional build pipeline;
- typed domain logic;
- installable PWA;
- low maintenance burden.

### Recommended Project Structure
- `src/app/`
  app bootstrap, navigation, shell, global state wiring
- `src/domain/`
  recipe models, calculations, planning, timer state machine, recovery logic
- `src/data/`
  recipe data, source metadata, generated indexes, fixtures
- `src/storage/`
  `localStorage` and `IndexedDB` access wrappers, migrations
- `src/ui/`
  screens, components, bottom sheets, runtime controls
- `src/pwa/`
  manifest metadata, service worker registration, update handling
- `src/styles/`
  tokens, layout primitives, red-safe mode, motion rules
- `src/debug/`
  debug screens, local trace export, assertions, developer utilities
- `src/tests/`
  domain fixtures and shared test helpers

### Architectural Boundaries
To keep the codebase stable and debuggable:
- recipe data should not know about the DOM;
- calculations should be pure functions;
- session planning should be deterministic from inputs;
- runtime state should be represented explicitly, not through scattered booleans;
- UI should render derived state, not invent business logic locally;
- storage should be versioned and isolated behind small interfaces;
- service worker behavior should stay separate from recipe logic.

### Session Engine Design
The runtime should be built around an explicit state machine with states such as:
- `idle`
- `planning`
- `ready`
- `running`
- `paused`
- `recovering`
- `completed`
- `aborted`

The engine should use:
- absolute timestamps as the source of truth;
- planned phase boundaries derived from the session plan;
- actual acknowledgement events recorded separately;
- UI countdowns derived from `now` minus stored timestamps, not from increment-only counters.

This is critical for surviving refresh, resume, or delayed wakeups.

### Service Worker Strategy
The service worker should be conservative and boring.

Requirements:
- app shell cached for offline use after first successful load;
- recipe data versioned intentionally;
- active sessions protected from disruptive update activation;
- update prompt deferred when a session is running;
- cache names versioned clearly;
- broken cache recovery path documented.

### Storage Strategy
Use `localStorage` for:
- theme and red-safe defaults;
- simple alert preferences;
- small last-used UI settings;
- last selected handedness or text size preference.

Use `IndexedDB` for:
- saved presets;
- chemistry batches;
- session history;
- active session snapshots;
- debug traces;
- migration metadata;
- future import/export bundles.

### Developer-Facing Programming Rules
The implementation should adopt a few non-negotiable rules:
- no chemistry formulas embedded directly in UI components;
- no timer logic based on `setInterval` drift alone;
- no hidden source assumptions;
- no service-worker update that can silently replace an active runtime;
- no storage reads or writes without schema version awareness;
- no special-case UI path that bypasses the shared planning engine unless clearly justified.

## Debugging, Diagnostics, And Stability Plan

### Why This Needs A Whole Section
This product has no backend and no server logs, but it still needs professional debugging support.
That means the app must be able to explain itself locally.

### Local Diagnostics To Build In
The app should expose an optional diagnostics area containing:
- current app version;
- recipe data version;
- active service worker version;
- storage schema version;
- last successful cache refresh time;
- active session state snapshot;
- recent session event log;
- last recovery event;
- last runtime error summary.

This can remain hidden behind a `Debug` or `Diagnostics` entry, but it should exist from early in development.

### Exportable Debug Bundle
Because there is no backend, the best debugging tool for real users is a local export.

The app should be able to export a small diagnostic bundle containing:
- app version metadata;
- selected recipe id;
- input snapshot;
- generated session plan;
- actual event log;
- recovery decisions;
- non-sensitive preference flags;
- any validation errors encountered.

This makes bug reports far easier without needing telemetry.

### In-App Event Log
The runtime should record a structured event stream such as:
- session created;
- session started;
- phase entered;
- cue emitted;
- user acknowledged cue;
- phase paused;
- app hidden;
- app visible again;
- recovery requested;
- recovery confirmed;
- session completed;
- session aborted.

This log should be lightweight and local-first.
It is useful for both debugging and user-facing completion summaries.

### Build-Time Assertions
The legacy HC-110 app had the right instinct with startup assertions.
The new version should strengthen that into:
- recipe fixture tests;
- formula expectation tests;
- schema validation in CI;
- migration tests;
- base-path and manifest checks for GitHub Pages;
- service-worker cache key tests.

### Runtime Safety Assertions
During development builds, the app should surface warnings when:
- a recipe resolves to zero phases unexpectedly;
- a phase duration is negative or implausibly short;
- a capacity rule cannot resolve;
- a recovery snapshot cannot be interpreted cleanly;
- a storage migration leaves orphaned data;
- a source-backed recipe is missing citation metadata.

### Failure Modes And Fallback Behaviors
The app should define fallback behavior for known trouble cases.

#### If Audio Is Blocked
- show a clear visual warning;
- encourage vibration or visual-only mode;
- let the user replay the alert test.

#### If Vibration Is Unsupported
- do not hide the fact;
- offer alternative alert emphasis.

#### If Recovery Confidence Is Low
- enter recovery mode with explicit uncertainty;
- allow manual confirmation rather than silent resume.

#### If Active Session State Is Corrupt
- preserve the diagnostic trail;
- offer safe reset and export;
- do not pretend the session can resume perfectly.

#### If Service Worker Cache Looks Broken
- show version mismatch clearly;
- offer cache reset instructions or automated cleanup action after confirmation.

### Stability Priorities
These engineering problems deserve first-class design attention.

#### 1. Timer Accuracy Under Backgrounding
The engine should not depend on perfect one-second loop continuity.
It should recompute countdown state from timestamps each render tick.

#### 2. Recovery After App Suspension
When the app returns from background or suspension:
- compare current wall clock to last persisted checkpoint;
- compute likely elapsed time;
- determine whether the phase can continue safely;
- surface uncertainty if necessary.

#### 3. Active-Session-Safe Updates
The service worker should not activate a new app shell mid-session without a safe handoff strategy.

#### 4. IndexedDB Migrations
All structured local data needs schema versions, migration tests, and defensive opening logic.

#### 5. GitHub Pages Base Path Safety
The app must be tested under the repository base path, not just root `/`, so manifest, service worker scope, icons, and route fallbacks behave correctly.

#### 6. Red-Safe Readability
Red-safe mode must be tested as a usability problem, not just as a color-token exercise.

#### 7. Wrong-Tap Resistance
Large controls, hold-to-confirm actions, and low-clutter layout should be treated as runtime safety features.

#### 8. Unsupported-Combinations Handling
The app should never fabricate a plausible-looking answer for unsupported chemistry combinations.

#### 9. Session Completion Integrity
Completion should update chemistry usage only once and only after the session reaches a clear end state.

#### 10. Recipe Growth Without Code Rot
Adding a new chemistry should mostly involve data, fixtures, and maybe a recipe-family adapter, not scattered edits across unrelated screens.

## Testing Plan

### Unit Tests
Use unit tests for:
- formula calculations;
- temperature adjustment logic;
- reuse logic;
- capacity and exhaustion rules;
- phase-list generation;
- alert scheduling;
- storage migrations.

### Integration Tests
Use integration tests for:
- recipe selection to session plan flow;
- session plan to runtime state flow;
- pause and resume behavior;
- recovery entry and exit;
- chemistry batch consumption updates;
- preset save and reload behavior.

### End-To-End Tests
Use end-to-end browser tests for:
- install-like app-shell behavior;
- offline revisit after first load;
- session launch from a preset;
- recovery after reload;
- transition into completion summary;
- red-safe mode layout sanity.

### Golden Fixtures
Create golden fixtures for representative recipes:
- Cs41 fresh chemistry;
- Cs41 reused chemistry;
- HC-110 one-shot dilution examples;
- DF96 monobath example;
- generic fix and wash stages.

Each fixture should assert:
- generated mix values;
- generated phase list;
- total duration;
- scheduled cues;
- warnings or unsupported states.

### Real-World Manual Test Matrix
Manual testing should include:
- iPhone installed as Home Screen web app;
- Android installed as PWA;
- mobile browser without installation;
- desktop browser in planning mode;
- low battery mode;
- reduced-motion preference;
- red-safe mode in a dim room;
- wet-hand thumb-use simulation.

### Failure-Mode Drills
Deliberately test:
- reload mid-session;
- background app during a long phase;
- lock and unlock phone;
- disable sound permissions;
- clear storage between versions;
- install a new build over an existing local database;
- intentionally miss an agitation cue;
- intentionally pause longer than expected.

## Delivery Strategy
The project should ship in phases, with each phase leaving the product more trustworthy and more testable.

## Phase 0 - Freeze The Product Baseline And Legacy Coverage
Goal: convert current discussions into explicit project rules and confirm what from the legacy apps is intentionally preserved.

### Deliverables
- confirm GitHub Pages as the initial hosting target;
- confirm the Vite + TypeScript + static PWA stack;
- confirm the V1 chemistry list;
- confirm the source hierarchy and confidence model;
- confirm that runtime darkroom mode is simpler than setup mode;
- confirm the list of recovered legacy strengths that must survive the rewrite.

### Important Decisions In This Phase
- whether alert profiles ship in strict V1 or V1.5;
- whether handedness support ships in V1 or later;
- whether recipe data is authored directly in JSON or generated from TypeScript definitions plus validation.

### Exit Criteria
- one written baseline exists;
- the recovered-legacy feature list is explicit;
- there is no remaining ambiguity about platform or product direction.

## Phase 1 - Define The Typed Domain Model
Goal: create the domain model that will drive both UI and runtime.

### Deliverables
- `Recipe`
- `RecipeSource`
- `RecipeFamily`
- `InputDefinition`
- `MixRule`
- `CapacityRule`
- `ReuseRule`
- `PhaseDefinition`
- `AgitationRule`
- `CueProfileDefinition`
- `SessionPlan`
- `ActiveSessionState`
- `PhaseEventLog`
- `SavedPreset`
- `ChemistryBatch`
- `TankProfile`
- `AlertProfile`
- `DiagnosticBundle`

### Special Focus
This phase must cover the subtle parts the legacy apps never modeled cleanly:
- confidence and provenance;
- unsupported-combination states;
- planned time versus actual acknowledged events;
- recovery uncertainty;
- chemistry usage accounting.

### Exit Criteria
- at least one typed schema exists for recipes and sessions;
- the schema can represent Cs41, HC-110, and DF96 without hacks;
- the schema can express a timeline preview, capacity warning, and next-cue countdown requirements.

## Phase 2 - Create The Data Authoring And Validation Pipeline
Goal: make recipe growth safe and repeatable.

### Deliverables
- recipe data authoring convention;
- source metadata convention;
- validation script or test suite;
- generated indexes for browsing and filtering;
- recipe fixture library;
- data review checklist for new chemistries.

### Why This Phase Matters
If recipe data is handled casually, the app will become inconsistent long before the code does.
This phase protects the future scale-up to more developers.

### Exit Criteria
- recipe entries fail fast when malformed;
- citations are required for source-backed recipes;
- one recipe family from color and one from B&W are represented cleanly.

## Phase 3 - Scaffold The App Foundation
Goal: create the professional barebones shell before product features.

### Deliverables
- Vite + TypeScript scaffold;
- linting, formatting, and test harness setup;
- app shell and navigation shell;
- manifest;
- service worker registration;
- GitHub Pages workflow;
- base CSS tokens including red-safe tokens;
- shared layout primitives;
- diagnostics shell;
- storage version registry.

### Exit Criteria
- app builds locally and in CI;
- app deploys to GitHub Pages;
- the shell is installable;
- offline revisit works after first load;
- version numbers and storage versions are inspectable.

## Phase 4 - Build The Session Planning And Timer Engine
Goal: implement the hardest core logic once, correctly.

### Deliverables
- recipe resolver;
- session-plan generator;
- deterministic timer engine;
- cue scheduler;
- pause and resume logic;
- interruption snapshot persistence;
- recovery coordinator;
- planned-versus-actual event log;
- runtime assertions for invalid state.

### Hard Parts To Solve Here
- drift-resistant countdowns;
- transition from ideal schedule to acknowledged reality;
- absolute-time calculations after background wake;
- multi-phase sequencing with optional steps;
- continuous versus intermittent agitation handling;
- next-cue countdown derivation.

### Exit Criteria
- a full sample session runs end-to-end from static data;
- pause, resume, reset, and recovery are predictable;
- timeline preview and active runtime use the same planning logic;
- next-cue display works for recipes that schedule agitation events.

## Phase 5 - Build The UX Shell And Darkroom Runtime
Goal: wrap the engine in a calm, practical interface.

### Deliverables
- Recipes screen;
- Setup screen;
- Mix And Plan screen;
- Session screen;
- Recovery screen;
- Completion screen;
- Chemistry screen;
- Saved screen;
- Settings screen;
- red-safe mode;
- thumb-zone-first action layout.

### Special UX Requirements
- all runtime-critical controls in the lower half of the screen;
- large readable numerals;
- visible next action;
- no dense table UI during runtime;
- hold-to-confirm for destructive actions;
- no silent automatic reset at completion.

### Exit Criteria
- a user can browse, configure, review, and start without encountering generic admin-style forms;
- the runtime feels usable on a phone with one hand;
- the completion state remains visible and useful.

## Phase 6 - Implement The First Chemistry Set Well
Goal: support a small but meaningful chemistry set to a high standard.

### Recommended V1 Chemistry Scope
- CineStill Cs41 Powder;
- Kodak HC-110;
- CineStill DF96;
- generic stop bath;
- generic fixer;
- generic hypo clear;
- generic wash, rinse, and wetting-agent stages.

### Recommended Order
1. Cs41
2. HC-110
3. DF96
4. shared generic bath stages

### Why This Order
- Cs41 gives a source-backed color workflow and exercises reuse rules;
- HC-110 gives a rich B&W developer with mix and capacity logic;
- DF96 proves the system can support a different, simpler workflow model.

### Exit Criteria
- each chemistry is source-labeled;
- each chemistry supports its relevant warnings and calculations;
- unsupported combinations fail cleanly;
- the first chemistry set collectively covers color, one-shot dilution math, reuse tracking, and monobath simplicity.

## Phase 7 - Add Solo-Operator Utility And Persistence
Goal: make the app feel like a personal tool instead of a stateless demo.

### Deliverables
- saved presets;
- recent sessions;
- chemistry batch tracking;
- tank profiles;
- bottle order helpers;
- delayed start;
- rehearsal mode;
- post-session notes;
- alert profiles;
- last-used settings restoration;
- last-session recovery card.

### Why This Phase Matters
This is where the app starts helping with repeated real-world use instead of only individual sessions.

### Exit Criteria
- a user can return later and find useful saved context;
- chemistry reuse is trackable locally;
- solo-friendly prep and repeat workflows reduce setup friction meaningfully.

## Phase 8 - Diagnostics, Hardening, And Update Safety
Goal: make the app resilient under real device behavior and easier to debug when something goes wrong.

### Deliverables
- diagnostics screen;
- debug export bundle;
- service worker update deferral during active sessions;
- cache reset pathway;
- storage migration tests;
- wake-lock strategy;
- audio unlock strategy;
- vibration fallback handling;
- recovery-confidence messaging;
- low-confidence fallback flow.

### Exit Criteria
- update behavior is deliberate;
- recovery uncertainty is surfaced honestly;
- local diagnostics are sufficient to investigate user bug reports without a backend.

## Phase 9 - Cross-Device QA And Real Darkroom Trials
Goal: validate the product under the conditions it is actually meant for.

### Test Categories
- recipe correctness against sources;
- timer behavior under interruption;
- install and offline flows;
- red-safe readability;
- one-handed usability;
- chemistry batch tracking integrity;
- completion and note flow;
- failure-mode handling.

### Real Scenario Drills
- start a Cs41 session and finish it fully offline;
- run an HC-110 session with capacity validation and full timeline review;
- pause and resume after backgrounding;
- miss an agitation cue and log the deviation;
- reuse a saved chemistry batch;
- complete a session and confirm the persistent summary flow;
- install a new version and verify update safety.

### Exit Criteria
- no blocker remains in active darkroom use;
- iPhone and Android behavior are acceptable for the supported workflow set;
- the app is trustworthy enough for non-demo use.

## Phase 10 - Open-Source Release And Contributor Readiness
Goal: publish a first credible public version that other people can understand and extend.

### Deliverables
- README;
- license;
- supported chemistry list;
- known limitations;
- contributor guide;
- issue templates;
- data authoring guide for new recipes;
- diagnostics guide for bug reports;
- release checklist.

### Exit Criteria
- a new contributor can understand how to add a recipe or investigate a timer bug;
- the repo can build from a clean clone;
- the public release is honest about source limitations and supported scope.

## Suggested Milestones

### Milestone 1 - Product And Schema Baseline
Complete phases 0 through 2.

### Milestone 2 - First Reliable Vertical Slice
Complete phases 3 through 5 with one chemistry, ideally Cs41.

### Milestone 3 - Balanced Core Feature Set
Complete phase 6 with Cs41, HC-110, and DF96.

### Milestone 4 - Real Personal Tool
Complete phase 7.

### Milestone 5 - Trustworthy Runtime And Debug Story
Complete phase 8.

### Milestone 6 - Release Candidate
Complete phases 9 and 10.

## Priority Order
If time and energy force aggressive sequencing, use this order:
1. product baseline and recovered legacy coverage
2. typed schema
3. data validation pipeline
4. scaffold and deploy shell
5. timer and recovery engine
6. UX shell and darkroom mode
7. Cs41 vertical slice
8. HC-110 vertical slice
9. DF96 vertical slice
10. persistence and chemistry tracking
11. diagnostics and hardening
12. release preparation

## Timeboxed Complexity Groups
These features are valuable but should be explicitly timeboxed so they do not silently absorb the entire project.

### Timebox Group A
- interruption recovery;
- chemistry batch tracking;
- alert profiles;
- debug export.

### Timebox Group B
- rehearsal mode;
- handedness support;
- post-session notes;
- tank and bottle profiles.

### Timebox Group C
- custom recipe editor;
- import/export bundles;
- advanced analytics;
- optional voice prompts.

## Success Criteria For V1
V1 is successful if:
- the app runs entirely as a static PWA on GitHub Pages;
- it installs and works offline on iPhone and Android;
- it supports at least Cs41, HC-110, and DF96 well;
- every supported recipe shows its source and confidence;
- timeline preview, capacity checks, next-cue guidance, and completion summary are all present where relevant;
- the live session UI is genuinely usable in a darkroom;
- solo users can run a session without paper notes for the supported workflows;
- interruption and recovery are honest and trustworthy;
- the codebase is clean enough that future developers can add chemistry without fear.

## Immediate Next Step
The next concrete move should be to define the typed recipe, source, session, and recovery schemas and create representative source-backed sample entries for Cs41, HC-110, and DF96 before any UI coding begins.
