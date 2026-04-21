import { describe, expect, it } from "vitest";
import type { CueEvent, PhaseDefinition } from "../domain/types";
import {
  buildPhaseTransitionToneKinds,
  phaseHasImmediateCue,
  resolveActiveCuePulseToneKind,
  resolveCueToneKind,
  resolvePhaseStartToneKind,
} from "./sessionAudio";

function createPhase(
  kind: PhaseDefinition["kind"],
  label = "Phase",
): PhaseDefinition {
  return {
    id: `${kind}-phase`,
    label,
    kind,
    durationSec: 30,
    detail: "Test phase.",
    cueEvents: [],
  };
}

describe("sessionAudio", () => {
  it("uses dedicated drain and fill tones for transition starts", () => {
    expect(
      resolvePhaseStartToneKind(createPhase("drain", "Drain developer")),
    ).toBe("drain");
    expect(
      resolvePhaseStartToneKind(createPhase("fill", "Fill stop bath")),
    ).toBe("fill");
    expect(resolvePhaseStartToneKind(createPhase("wash", "Wash"))).toBe(
      "phase_start",
    );
  });

  it("builds phase-end plus phase-start tone sequences for automatic transitions", () => {
    expect(
      buildPhaseTransitionToneKinds(
        createPhase("developer", "Developer"),
        createPhase("drain", "Drain monobath"),
      ),
    ).toEqual(["phase_end", "drain"]);

    expect(
      buildPhaseTransitionToneKinds(
        createPhase("drain", "Drain monobath"),
        createPhase("wash", "Wash"),
      ),
    ).toEqual(["phase_end", "phase_start"]);
  });

  it("can suppress the phase-start tone when the next phase is waiting for confirmation", () => {
    expect(
      buildPhaseTransitionToneKinds(
        createPhase("developer", "Developer"),
        createPhase("instruction", "Minimal wash · 5 inversions"),
        { includeStartTone: false },
      ),
    ).toEqual(["phase_end"]);
  });

  it("maps cue styles into soft vs strong cue tones", () => {
    const softCue: CueEvent = {
      id: "soft",
      atSec: 10,
      label: "Prepare to agitate",
      style: "soft",
    };
    const strongCue: CueEvent = {
      id: "strong",
      atSec: 15,
      label: "Invert 1",
      style: "strong",
    };

    expect(resolveCueToneKind(softCue)).toBe("cue_soft");
    expect(resolveCueToneKind(strongCue)).toBe("cue_strong");
  });

  it("softens sustained cue-window pulses after the initial strong cue", () => {
    const strongWindowCue: CueEvent = {
      id: "strong-window",
      atSec: 60,
      durationSec: 10,
      label: "Agitate for 10 sec",
      style: "strong",
    };

    expect(resolveActiveCuePulseToneKind(strongWindowCue)).toBe("cue_soft");
  });

  it("detects immediate phase cues at 0 seconds", () => {
    const phaseWithImmediateCue = {
      ...createPhase("developer", "Monobath"),
      cueEvents: [
        {
          id: "start",
          atSec: 0,
          label: "Start constant agitation",
          style: "strong" as const,
        },
      ],
    };

    expect(phaseHasImmediateCue(phaseWithImmediateCue)).toBe(true);
    expect(phaseHasImmediateCue(createPhase("wash", "Wash"))).toBe(false);
  });
});
