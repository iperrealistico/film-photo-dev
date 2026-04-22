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

let activeVoiceAudio: HTMLAudioElement | null = null;

export function getSessionNoticeById(id: SessionNoticeId) {
  return sessionNoticeCatalog[id];
}

export function resolveStartSessionNotice() {
  return getSessionNoticeById("start_session");
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
    return null;
  }

  return getSessionNoticeById(`invert_${match[1]}` as SessionNoticeId);
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
