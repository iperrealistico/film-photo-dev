import type { CueEvent, PhaseDefinition } from "../domain/types";

export type SessionToneKind =
  | "button"
  | "phase_start"
  | "phase_end"
  | "drain"
  | "fill"
  | "cue_soft"
  | "cue_strong";

interface ToneRecipe {
  attackSec: number;
  durationSec: number;
  endFrequency: number;
  oscillatorType: OscillatorType;
  peakGain: number;
  releaseSec: number;
  startFrequency: number;
}

const toneRecipes: Record<SessionToneKind, ToneRecipe> = {
  button: {
    oscillatorType: "sine",
    startFrequency: 1046.5,
    endFrequency: 880,
    durationSec: 0.09,
    attackSec: 0.01,
    releaseSec: 0.085,
    peakGain: 0.012,
  },
  phase_start: {
    oscillatorType: "sine",
    startFrequency: 660,
    endFrequency: 988,
    durationSec: 0.12,
    attackSec: 0.012,
    releaseSec: 0.11,
    peakGain: 0.016,
  },
  phase_end: {
    oscillatorType: "triangle",
    startFrequency: 740,
    endFrequency: 440,
    durationSec: 0.14,
    attackSec: 0.015,
    releaseSec: 0.13,
    peakGain: 0.015,
  },
  drain: {
    oscillatorType: "sawtooth",
    startFrequency: 540,
    endFrequency: 320,
    durationSec: 0.16,
    attackSec: 0.015,
    releaseSec: 0.15,
    peakGain: 0.013,
  },
  fill: {
    oscillatorType: "sine",
    startFrequency: 420,
    endFrequency: 760,
    durationSec: 0.17,
    attackSec: 0.015,
    releaseSec: 0.16,
    peakGain: 0.014,
  },
  cue_soft: {
    oscillatorType: "triangle",
    startFrequency: 880,
    endFrequency: 740,
    durationSec: 0.13,
    attackSec: 0.015,
    releaseSec: 0.13,
    peakGain: 0.02,
  },
  cue_strong: {
    oscillatorType: "square",
    startFrequency: 988,
    endFrequency: 784,
    durationSec: 0.16,
    attackSec: 0.012,
    releaseSec: 0.15,
    peakGain: 0.018,
  },
};

let sharedAudioContext: AudioContext | null = null;

function getSharedAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!("AudioContext" in window || "webkitAudioContext" in window)) {
    return null;
  }

  if (sharedAudioContext && sharedAudioContext.state !== "closed") {
    return sharedAudioContext;
  }

  const Context =
    window.AudioContext ??
    (
      window as typeof window & {
        webkitAudioContext: typeof AudioContext;
      }
    ).webkitAudioContext;
  sharedAudioContext = new Context();
  return sharedAudioContext;
}

function scheduleTone(
  audioContext: AudioContext,
  kind: SessionToneKind,
  offsetSec: number,
) {
  const recipe = toneRecipes[kind];
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const startAt = audioContext.currentTime + offsetSec;

  oscillator.type = recipe.oscillatorType;
  oscillator.frequency.setValueAtTime(recipe.startFrequency, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(
    recipe.endFrequency,
    startAt + recipe.durationSec,
  );
  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.exponentialRampToValueAtTime(
    recipe.peakGain,
    startAt + recipe.attackSec,
  );
  gainNode.gain.exponentialRampToValueAtTime(
    0.0001,
    startAt + recipe.releaseSec,
  );

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + recipe.durationSec);

  return recipe.durationSec;
}

export function playToneSequence(kinds: readonly SessionToneKind[]) {
  if (kinds.length === 0) {
    return;
  }

  const audioContext = getSharedAudioContext();

  if (!audioContext) {
    return;
  }

  if (audioContext.state === "suspended") {
    void audioContext.resume().catch(() => undefined);
  }

  let offsetSec = 0;

  for (const kind of kinds) {
    const durationSec = scheduleTone(audioContext, kind, offsetSec);
    offsetSec += Math.max(0.08, durationSec * 0.85);
  }
}

export function resolveCueToneKind(cue: CueEvent): SessionToneKind {
  return cue.style === "strong" ? "cue_strong" : "cue_soft";
}

export function resolveActiveCuePulseToneKind(cue: CueEvent): SessionToneKind {
  return cue.style === "strong" ? "cue_soft" : resolveCueToneKind(cue);
}

export function resolvePhaseStartToneKind(
  phase: PhaseDefinition | null | undefined,
): SessionToneKind {
  switch (phase?.kind) {
    case "drain":
      return "drain";
    case "fill":
      return "fill";
    default:
      return "phase_start";
  }
}

export function buildPhaseTransitionToneKinds(
  previousPhase: PhaseDefinition | null | undefined,
  nextPhase: PhaseDefinition | null | undefined,
  options?: {
    includeStartTone?: boolean;
  },
) {
  const kinds: SessionToneKind[] = [];

  if (previousPhase) {
    kinds.push("phase_end");
  }

  if (options?.includeStartTone !== false && nextPhase) {
    kinds.push(resolvePhaseStartToneKind(nextPhase));
  }

  return kinds;
}

export function phaseHasImmediateCue(
  phase: PhaseDefinition | null | undefined,
) {
  return Boolean(phase?.cueEvents.some((cue) => cue.atSec === 0));
}
