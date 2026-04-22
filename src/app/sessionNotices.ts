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
    1000,
  ),
  starting_in_2: createNoticeSpec(
    "starting_in_2",
    "Starting in 2 seconds",
    "Starting in two seconds",
    ["phase_start"],
    2000,
  ),
  starting_in_3: createNoticeSpec(
    "starting_in_3",
    "Starting in 3 seconds",
    "Starting in three seconds",
    ["phase_start"],
    3000,
  ),
  starting_in_4: createNoticeSpec(
    "starting_in_4",
    "Starting in 4 seconds",
    "Starting in four seconds",
    ["phase_start"],
    4000,
  ),
  starting_in_5: createNoticeSpec(
    "starting_in_5",
    "Starting in 5 seconds",
    "Starting in five seconds",
    ["phase_start"],
    5000,
  ),
  starting_in_6: createNoticeSpec(
    "starting_in_6",
    "Starting in 6 seconds",
    "Starting in six seconds",
    ["phase_start"],
    6000,
  ),
  starting_in_7: createNoticeSpec(
    "starting_in_7",
    "Starting in 7 seconds",
    "Starting in seven seconds",
    ["phase_start"],
    7000,
  ),
  starting_in_8: createNoticeSpec(
    "starting_in_8",
    "Starting in 8 seconds",
    "Starting in eight seconds",
    ["phase_start"],
    8000,
  ),
  starting_in_9: createNoticeSpec(
    "starting_in_9",
    "Starting in 9 seconds",
    "Starting in nine seconds",
    ["phase_start"],
    9000,
  ),
  starting_in_10: createNoticeSpec(
    "starting_in_10",
    "Starting in 10 seconds",
    "Starting in ten seconds",
    ["phase_start"],
    10000,
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
  agitate_gently_5_sec: createNoticeSpec(
    "agitate_gently_5_sec",
    "Agitate gently for 5 sec",
    "Agitate gently for 5 seconds",
    ["cue_strong"],
    1200,
  ),
  stop_agitation: createNoticeSpec(
    "stop_agitation",
    "Stop agitation",
    "Stop agitation",
    ["cue_soft"],
    1000,
  ),
  pre_soak: createNoticeSpec("pre_soak", "Pre-soak", "Pre-soak", ["phase_start"]),
  developer: createNoticeSpec("developer", "Developer", "Developer", ["phase_start"]),
  transition_to_blix: createNoticeSpec(
    "transition_to_blix",
    "Transition to blix",
    "Transition to blix",
    ["phase_start"],
  ),
  blix: createNoticeSpec("blix", "Blix", "Blix", ["phase_start"]),
  transition_to_wash: createNoticeSpec(
    "transition_to_wash",
    "Transition to wash",
    "Transition to wash",
    ["phase_start"],
  ),
  wash: createNoticeSpec("wash", "Wash", "Wash", ["phase_start"]),
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
    "Fill stop bath",
    "Fill stop bath",
    ["fill"],
  ),
  stop_bath: createNoticeSpec(
    "stop_bath",
    "Stop bath",
    "Stop bath",
    ["phase_start"],
  ),
  drain_stop: createNoticeSpec("drain_stop", "Drain stop", "Drain stop", ["drain"]),
  fill_fixer: createNoticeSpec("fill_fixer", "Fill fixer", "Fill fixer", ["fill"]),
  fixer: createNoticeSpec("fixer", "Fixer", "Fixer", ["phase_start"]),
  drain_fixer: createNoticeSpec(
    "drain_fixer",
    "Drain fixer",
    "Drain fixer",
    ["drain"],
  ),
  fill_hypo_clear: createNoticeSpec(
    "fill_hypo_clear",
    "Fill hypo clear",
    "Fill hypo clear",
    ["fill"],
  ),
  hypo_clear: createNoticeSpec(
    "hypo_clear",
    "Hypo clear",
    "Hypo clear",
    ["phase_start"],
  ),
  fill_wash: createNoticeSpec("fill_wash", "Fill wash", "Fill wash", ["fill"]),
  wetting_agent: createNoticeSpec(
    "wetting_agent",
    "Wetting agent",
    "Wetting agent",
    ["phase_start"],
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

export type SessionNoticeId = keyof typeof sessionNoticeCatalog;
export type SessionNoticeSpec =
  (typeof sessionNoticeCatalog)[SessionNoticeId];

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

const phaseNoticeIdByPhaseId: Partial<Record<string, SessionNoticeId>> = {
  presoak: "pre_soak",
  developer: "developer",
  transition: "transition_to_blix",
  blix: "blix",
  "transition-wash": "transition_to_wash",
  wash: "wash",
  "final-rinse": "final_rinse",
  "drain-dev": "drain_developer",
  "fill-stop": "fill_stop_bath",
  stop: "stop_bath",
  "drain-stop": "drain_stop",
  "fill-fix": "fill_fixer",
  fix: "fixer",
  "drain-fix": "drain_fixer",
  "fill-hypo": "fill_hypo_clear",
  hypo: "hypo_clear",
  "fill-wash": "fill_wash",
  wetting: "wetting_agent",
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
  "Agitate gently for 5 sec": "agitate_gently_5_sec",
};

let activeVoiceAudio: HTMLAudioElement | null = null;

export function getSessionNoticeById(id: SessionNoticeId) {
  return sessionNoticeCatalog[id];
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

  return cueNoticeIdByLabel[cue.label]
    ? getSessionNoticeById("stop_agitation")
    : null;
}

export function listSessionNoticeCacheUrls() {
  return Object.values(noticeAudioManifest).map((path) => `./${path}`);
}

export function resolveSessionNoticeAudioUrl(spec: SessionNoticeSpec) {
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

export async function playSessionNoticeVoice(spec: SessionNoticeSpec) {
  if (typeof window === "undefined" || typeof Audio === "undefined") {
    return;
  }

  stopSessionNoticeVoice();

  const audio = new Audio(resolveSessionNoticeAudioUrl(spec));
  audio.preload = "auto";
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
