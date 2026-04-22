import type { CueEvent, PhaseDefinition } from "../domain/types";
import type { SessionToneKind } from "./sessionAudio";

function createNoticeSpec<TId extends string>(
  id: TId,
  headline: string,
  spokenText: string,
  toneKinds: readonly SessionToneKind[],
  durationMs = 1800,
) {
  return {
    id,
    headline,
    spokenText,
    durationMs,
    toneKinds,
    audioPath: `audio/notices/${id.replaceAll("_", "-")}.mp3`,
  } as const;
}

const countdownNoticeDurationMs = 1200;

export const sessionNoticeCatalog = {
  start_session: createNoticeSpec(
    "start_session",
    "Start session",
    "Start session",
    ["phase_start"],
  ),
  starting_in_1: createNoticeSpec(
    "starting_in_1",
    "Starting in 1 second",
    "Starting in one second",
    ["phase_start"],
    countdownNoticeDurationMs,
  ),
  starting_in_2: createNoticeSpec(
    "starting_in_2",
    "Starting in 2 seconds",
    "Starting in two seconds",
    ["phase_start"],
    countdownNoticeDurationMs,
  ),
  starting_in_3: createNoticeSpec(
    "starting_in_3",
    "Starting in 3 seconds",
    "Starting in three seconds",
    ["phase_start"],
    countdownNoticeDurationMs,
  ),
  starting_in_4: createNoticeSpec(
    "starting_in_4",
    "Starting in 4 seconds",
    "Starting in four seconds",
    ["phase_start"],
    countdownNoticeDurationMs,
  ),
  starting_in_5: createNoticeSpec(
    "starting_in_5",
    "Starting in 5 seconds",
    "Starting in five seconds",
    ["phase_start"],
    countdownNoticeDurationMs,
  ),
  starting_in_6: createNoticeSpec(
    "starting_in_6",
    "Starting in 6 seconds",
    "Starting in six seconds",
    ["phase_start"],
    countdownNoticeDurationMs,
  ),
  starting_in_7: createNoticeSpec(
    "starting_in_7",
    "Starting in 7 seconds",
    "Starting in seven seconds",
    ["phase_start"],
    countdownNoticeDurationMs,
  ),
  starting_in_8: createNoticeSpec(
    "starting_in_8",
    "Starting in 8 seconds",
    "Starting in eight seconds",
    ["phase_start"],
    countdownNoticeDurationMs,
  ),
  starting_in_9: createNoticeSpec(
    "starting_in_9",
    "Starting in 9 seconds",
    "Starting in nine seconds",
    ["phase_start"],
    countdownNoticeDurationMs,
  ),
  starting_in_10: createNoticeSpec(
    "starting_in_10",
    "Starting in 10 seconds",
    "Starting in ten seconds",
    ["phase_start"],
    countdownNoticeDurationMs,
  ),
  session_complete: createNoticeSpec(
    "session_complete",
    "Session complete",
    "Session complete",
    ["phase_end"],
  ),
  session_stopped: createNoticeSpec(
    "session_stopped",
    "Session stopped",
    "Session stopped",
    ["phase_end"],
  ),
  invert_1: createNoticeSpec("invert_1", "Invert 1", "Invert one", ["cue_strong"]),
  invert_2: createNoticeSpec("invert_2", "Invert 2", "Invert two", ["cue_soft"]),
  invert_3: createNoticeSpec("invert_3", "Invert 3", "Invert three", ["cue_soft"]),
  invert_4: createNoticeSpec("invert_4", "Invert 4", "Invert four", ["cue_soft"]),
  invert_5: createNoticeSpec("invert_5", "Invert 5", "Invert five", ["cue_soft"]),
  invert_6: createNoticeSpec("invert_6", "Invert 6", "Invert six", ["cue_soft"]),
  invert_7: createNoticeSpec("invert_7", "Invert 7", "Invert seven", ["cue_soft"]),
  invert_8: createNoticeSpec("invert_8", "Invert 8", "Invert eight", ["cue_soft"]),
  invert_9: createNoticeSpec("invert_9", "Invert 9", "Invert nine", ["cue_soft"]),
  invert_10: createNoticeSpec("invert_10", "Invert 10", "Invert ten", ["cue_soft"]),
  start_continuous_agitation: createNoticeSpec(
    "start_continuous_agitation",
    "Start continuous agitation",
    "Start continuous agitation",
    ["cue_strong"],
    1200,
  ),
  start_constant_agitation: createNoticeSpec(
    "start_constant_agitation",
    "Start constant agitation",
    "Start constant agitation",
    ["cue_strong"],
    1200,
  ),
  agitate_continuously_60_sec: createNoticeSpec(
    "agitate_continuously_60_sec",
    "Agitate continuously for 60 sec",
    "Agitate continuously for 60 seconds",
    ["cue_strong"],
    1200,
  ),
  agitate_continuously_30_sec: createNoticeSpec(
    "agitate_continuously_30_sec",
    "Agitate continuously for 30 sec",
    "Agitate continuously for 30 seconds",
    ["cue_strong"],
    1200,
  ),
  agitate_continuously_10_sec: createNoticeSpec(
    "agitate_continuously_10_sec",
    "Agitate continuously for 10 sec",
    "Agitate continuously for 10 seconds",
    ["cue_strong"],
    1200,
  ),
  agitate_gently_10_sec: createNoticeSpec(
    "agitate_gently_10_sec",
    "Agitate gently for 10 sec",
    "Agitate gently for 10 seconds",
    ["cue_strong"],
    1200,
  ),
  agitate_10_sec: createNoticeSpec(
    "agitate_10_sec",
    "Agitate for 10 sec",
    "Agitate for 10 seconds",
    ["cue_strong"],
    1200,
  ),
  agitate_15_sec: createNoticeSpec(
    "agitate_15_sec",
    "Agitate for 15 sec",
    "Agitate for 15 seconds",
    ["cue_strong"],
    1200,
  ),
  agitate_gently_5_sec: createNoticeSpec(
    "agitate_gently_5_sec",
    "Agitate gently for 5 sec",
    "Agitate gently for 5 seconds",
    ["cue_strong"],
    1200,
  ),
  prepare_to_agitate: createNoticeSpec(
    "prepare_to_agitate",
    "Prepare to agitate",
    "Prepare to agitate",
    ["cue_soft"],
    1200,
  ),
  keep_agitating_halfway: createNoticeSpec(
    "keep_agitating_halfway",
    "Halfway there",
    "Keep agitating. Halfway there.",
    ["cue_soft"],
    1200,
  ),
  stop_agitation: createNoticeSpec(
    "stop_agitation",
    "Stop agitation",
    "Stop agitation",
    ["cue_soft"],
    1000,
  ),
  pour_pre_soak_water: createNoticeSpec(
    "pour_pre_soak_water",
    "Pour pre-soak water",
    "Pour pre-soak water",
    ["fill"],
  ),
  drain_pre_soak: createNoticeSpec(
    "drain_pre_soak",
    "Drain pre-soak",
    "Drain pre-soak",
    ["drain"],
  ),
  pre_soak: createNoticeSpec("pre_soak", "Pre-soak", "Pre-soak", ["phase_start"]),
  pour_developer: createNoticeSpec(
    "pour_developer",
    "Pour developer",
    "Pour developer",
    ["fill"],
  ),
  developer: createNoticeSpec("developer", "Developer", "Developer", ["phase_start"]),
  transition_to_blix: createNoticeSpec(
    "transition_to_blix",
    "Transition to blix",
    "Transition to blix",
    ["phase_start"],
  ),
  pour_blix: createNoticeSpec("pour_blix", "Pour blix", "Pour blix", ["fill"]),
  blix: createNoticeSpec("blix", "Blix", "Blix", ["phase_start"]),
  drain_blix: createNoticeSpec("drain_blix", "Drain blix", "Drain blix", ["drain"]),
  transition_to_wash: createNoticeSpec(
    "transition_to_wash",
    "Transition to wash",
    "Transition to wash",
    ["phase_start"],
  ),
  drain_wash: createNoticeSpec("drain_wash", "Drain wash", "Drain wash", ["drain"]),
  wash: createNoticeSpec("wash", "Wash", "Wash", ["phase_start"]),
  pour_final_rinse: createNoticeSpec(
    "pour_final_rinse",
    "Pour final rinse",
    "Pour final rinse",
    ["fill"],
  ),
  final_rinse: createNoticeSpec(
    "final_rinse",
    "Final rinse",
    "Final rinse",
    ["phase_start"],
  ),
  drain_developer: createNoticeSpec(
    "drain_developer",
    "Drain developer",
    "Drain developer",
    ["drain"],
  ),
  fill_stop_bath: createNoticeSpec(
    "fill_stop_bath",
    "Pour stop bath",
    "Pour stop bath",
    ["fill"],
  ),
  stop_bath: createNoticeSpec(
    "stop_bath",
    "Stop bath",
    "Stop bath",
    ["phase_start"],
  ),
  drain_stop: createNoticeSpec("drain_stop", "Drain stop", "Drain stop", ["drain"]),
  fill_fixer: createNoticeSpec("fill_fixer", "Pour fixer", "Pour fixer", ["fill"]),
  fixer: createNoticeSpec("fixer", "Fixer", "Fixer", ["phase_start"]),
  drain_fixer: createNoticeSpec(
    "drain_fixer",
    "Drain fixer",
    "Drain fixer",
    ["drain"],
  ),
  drain_hypo_clear: createNoticeSpec(
    "drain_hypo_clear",
    "Drain hypo clear",
    "Drain hypo clear",
    ["drain"],
  ),
  fill_hypo_clear: createNoticeSpec(
    "fill_hypo_clear",
    "Pour hypo clear",
    "Pour hypo clear",
    ["fill"],
  ),
  hypo_clear: createNoticeSpec(
    "hypo_clear",
    "Hypo clear",
    "Hypo clear",
    ["phase_start"],
  ),
  fill_wash: createNoticeSpec(
    "fill_wash",
    "Pour wash water",
    "Pour wash water",
    ["fill"],
  ),
  pour_wetting_agent: createNoticeSpec(
    "pour_wetting_agent",
    "Pour wetting agent",
    "Pour wetting agent",
    ["fill"],
  ),
  wetting_agent: createNoticeSpec(
    "wetting_agent",
    "Wetting agent",
    "Wetting agent",
    ["phase_start"],
  ),
  pour_monobath: createNoticeSpec(
    "pour_monobath",
    "Pour monobath",
    "Pour monobath",
    ["fill"],
  ),
  monobath: createNoticeSpec("monobath", "Monobath", "Monobath", ["phase_start"]),
  drain_monobath: createNoticeSpec(
    "drain_monobath",
    "Drain monobath",
    "Drain monobath",
    ["drain"],
  ),
  minimal_wash_5: createNoticeSpec(
    "minimal_wash_5",
    "Minimal wash 5 inversions",
    "Minimal wash five inversions",
    ["phase_start"],
  ),
  minimal_wash_10: createNoticeSpec(
    "minimal_wash_10",
    "Minimal wash 10 inversions",
    "Minimal wash ten inversions",
    ["phase_start"],
  ),
  minimal_wash_20: createNoticeSpec(
    "minimal_wash_20",
    "Minimal wash 20 inversions",
    "Minimal wash twenty inversions",
    ["phase_start"],
  ),
} as const;

export const additionalVoicePromptCatalog = {
  review_blocked: createNoticeSpec(
    "review_blocked",
    "Start blocked",
    "Start blocked. Review the setup before starting.",
    [],
  ),
  recovered_session: createNoticeSpec(
    "recovered_session",
    "Recovered session",
    "Recovered session. Check the timer before continuing.",
    [],
  ),
  next_step_waiting: createNoticeSpec(
    "next_step_waiting",
    "Next step waiting",
    "Next step is waiting. Begin when ready.",
    [],
  ),
} as const;

export type SessionNoticeId = keyof typeof sessionNoticeCatalog;
export type SessionNoticeSpec =
  (typeof sessionNoticeCatalog)[SessionNoticeId];
export type AdditionalVoicePromptId = keyof typeof additionalVoicePromptCatalog;
export type AdditionalVoicePromptSpec =
  (typeof additionalVoicePromptCatalog)[AdditionalVoicePromptId];
type AudioPromptSpec = SessionNoticeSpec | AdditionalVoicePromptSpec;

const sessionStartCountdownNoticeIds = {
  1: "starting_in_1",
  2: "starting_in_2",
  3: "starting_in_3",
  4: "starting_in_4",
  5: "starting_in_5",
  6: "starting_in_6",
  7: "starting_in_7",
  8: "starting_in_8",
  9: "starting_in_9",
  10: "starting_in_10",
} as const satisfies Record<number, SessionNoticeId>;

export const noticeAudioManifest = Object.fromEntries(
  Object.entries(sessionNoticeCatalog).map(([id, spec]) => [id, spec.audioPath]),
) as Record<SessionNoticeId, string>;
export const additionalVoicePromptAudioManifest = Object.fromEntries(
  Object.entries(additionalVoicePromptCatalog).map(([id, spec]) => [
    id,
    spec.audioPath,
  ]),
) as Record<AdditionalVoicePromptId, string>;

const phaseNoticeIdByPhaseId: Partial<Record<string, SessionNoticeId>> = {
  "fill-presoak": "pour_pre_soak_water",
  "drain-presoak": "drain_pre_soak",
  presoak: "pre_soak",
  "fill-dev": "pour_developer",
  developer: "developer",
  transition: "transition_to_blix",
  "fill-blix": "pour_blix",
  blix: "blix",
  "drain-blix": "drain_blix",
  "transition-wash": "transition_to_wash",
  wash: "wash",
  "drain-wash": "drain_wash",
  "fill-final-rinse": "pour_final_rinse",
  "final-rinse": "final_rinse",
  "drain-dev": "drain_developer",
  "fill-stop": "fill_stop_bath",
  stop: "stop_bath",
  "drain-stop": "drain_stop",
  "fill-fix": "fill_fixer",
  fix: "fixer",
  "drain-fix": "drain_fixer",
  "drain-hypo": "drain_hypo_clear",
  "fill-hypo": "fill_hypo_clear",
  hypo: "hypo_clear",
  "fill-wash": "fill_wash",
  "fill-wetting": "pour_wetting_agent",
  wetting: "wetting_agent",
  "fill-mono": "pour_monobath",
  monobath: "monobath",
  "drain-monobath": "drain_monobath",
  "wash-minimal-1": "minimal_wash_5",
  "wash-minimal-2": "minimal_wash_10",
  "wash-minimal-3": "minimal_wash_20",
  "wash-minimal-4": "final_rinse",
};

const cueNoticeIdByLabel: Partial<Record<string, SessionNoticeId>> = {
  "Start continuous agitation": "start_continuous_agitation",
  "Start constant agitation": "start_constant_agitation",
  "Agitate continuously for 60 sec": "agitate_continuously_60_sec",
  "Agitate continuously for 30 sec": "agitate_continuously_30_sec",
  "Agitate continuously for 10 sec": "agitate_continuously_10_sec",
  "Agitate gently for 10 sec": "agitate_gently_10_sec",
  "Agitate for 10 sec": "agitate_10_sec",
  "Agitate for 15 sec": "agitate_15_sec",
  "Agitate gently for 5 sec": "agitate_gently_5_sec",
  "Prepare to agitate": "prepare_to_agitate",
};

let activeVoiceAudio: HTMLAudioElement | null = null;

function isSessionNoticeId(value: string): value is SessionNoticeId {
  return value in sessionNoticeCatalog;
}

export function getSessionNoticeById(id: SessionNoticeId) {
  return sessionNoticeCatalog[id];
}

export function getAdditionalVoicePromptById(id: AdditionalVoicePromptId) {
  return additionalVoicePromptCatalog[id];
}

export function resolveStartSessionNotice() {
  return getSessionNoticeById("start_session");
}

export function resolveSessionStartCountdownNotice(countdownSec: number) {
  const roundedCountdown = Math.min(10, Math.max(1, Math.round(countdownSec)));
  return getSessionNoticeById(
    sessionStartCountdownNoticeIds[
      roundedCountdown as keyof typeof sessionStartCountdownNoticeIds
    ],
  );
}

export function resolveCompletedSessionNotice() {
  return getSessionNoticeById("session_complete");
}

export function resolveStoppedSessionNotice() {
  return getSessionNoticeById("session_stopped");
}

export function resolvePhaseNotice(
  phase: PhaseDefinition | null | undefined,
) {
  const noticeId = phase ? phaseNoticeIdByPhaseId[phase.id] : undefined;
  return noticeId ? getSessionNoticeById(noticeId) : null;
}

export function resolveCueNotice(cue: CueEvent | null | undefined) {
  if (!cue) {
    return null;
  }

  if ("noticeId" in cue) {
    if (!cue.noticeId) {
      return null;
    }

    return isSessionNoticeId(cue.noticeId)
      ? getSessionNoticeById(cue.noticeId)
      : null;
  }

  const match = /^Invert (10|[1-9])$/.exec(cue.label);

  if (!match) {
    const noticeId = cueNoticeIdByLabel[cue.label];
    return noticeId ? getSessionNoticeById(noticeId) : null;
  }

  return getSessionNoticeById(`invert_${match[1]}` as SessionNoticeId);
}

export function resolveTimedCueEndNotice(cue: CueEvent | null | undefined) {
  if (!cue?.durationSec || cue.durationSec <= 0) {
    return null;
  }

  if ("endNoticeId" in cue) {
    if (!cue.endNoticeId) {
      return null;
    }

    return isSessionNoticeId(cue.endNoticeId)
      ? getSessionNoticeById(cue.endNoticeId)
      : null;
  }

  return cueNoticeIdByLabel[cue.label]
    ? getSessionNoticeById("stop_agitation")
    : null;
}

export function resolveTimedCueMidpointNotice(cue: CueEvent | null | undefined) {
  if (!cue?.durationSec || cue.durationSec <= 10) {
    return null;
  }

  return getSessionNoticeById("keep_agitating_halfway");
}

export function listSessionNoticeCacheUrls() {
  return Object.values(noticeAudioManifest).map((path) => `./${path}`);
}

export function listAdditionalVoicePromptCacheUrls() {
  return Object.values(additionalVoicePromptAudioManifest).map(
    (path) => `./${path}`,
  );
}

export function resolveSessionNoticeAudioUrl(spec: AudioPromptSpec) {
  return `${import.meta.env.BASE_URL}${spec.audioPath}`;
}

export function stopSessionNoticeVoice() {
  if (!activeVoiceAudio) {
    return;
  }

  activeVoiceAudio.pause();
  activeVoiceAudio.currentTime = 0;
  activeVoiceAudio = null;
}

export async function playSessionNoticeVoice(
  spec: AudioPromptSpec,
  options?: {
    playbackRate?: number;
    volume?: number;
  },
) {
  if (typeof window === "undefined" || typeof Audio === "undefined") {
    return;
  }

  stopSessionNoticeVoice();

  const audio = new Audio(resolveSessionNoticeAudioUrl(spec));
  audio.preload = "auto";
  audio.playbackRate = Math.min(
    3,
    Math.max(1, options?.playbackRate ?? 1.5),
  );
  audio.volume = Math.min(1, Math.max(0, options?.volume ?? 1));
  activeVoiceAudio = audio;

  const releaseActiveAudio = () => {
    if (activeVoiceAudio === audio) {
      activeVoiceAudio = null;
    }
  };

  audio.addEventListener("ended", releaseActiveAudio, { once: true });
  audio.addEventListener("error", releaseActiveAudio, { once: true });

  try {
    await audio.play();
  } catch {
    releaseActiveAudio();
  }
}
