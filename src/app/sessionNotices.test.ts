import { describe, expect, it } from "vitest";
import type { CueEvent, PhaseDefinition } from "../domain/types";
import {
  listSessionNoticeCacheUrls,
  noticeAudioManifest,
  resolveCueNotice,
  resolvePhaseNotice,
  resolveStartSessionNotice,
} from "./sessionNotices";

function createPhase(id: string, label: string): PhaseDefinition {
  return {
    id,
    label,
    kind: "developer",
    durationSec: 30,
    detail: "Test phase.",
    cueEvents: [],
  };
}

describe("sessionNotices", () => {
  it("maps runtime phases into the finite fullscreen notice catalog", () => {
    expect(resolvePhaseNotice(createPhase("drain-dev", "Drain developer"))?.id).toBe(
      "drain_developer",
    );
    expect(resolvePhaseNotice(createPhase("wash-minimal-2", "Minimal wash"))?.id).toBe(
      "minimal_wash_10",
    );
    expect(resolvePhaseNotice(createPhase("unknown", "Unknown"))).toBeNull();
  });

  it("only resolves inversion cues into fullscreen notices", () => {
    const inversionCue: CueEvent = {
      id: "invert-3",
      atSec: 10,
      label: "Invert 3",
      style: "soft",
    };
    const prepareCue: CueEvent = {
      id: "prepare",
      atSec: 20,
      label: "Prepare to agitate",
      style: "soft",
    };

    expect(resolveCueNotice(inversionCue)?.id).toBe("invert_3");
    expect(resolveCueNotice(prepareCue)).toBeNull();
  });

  it("exposes a checked-in audio manifest and precache URL list", () => {
    expect(resolveStartSessionNotice().audioPath).toBe(
      "audio/notices/start-session.mp3",
    );
    expect(noticeAudioManifest.session_complete).toBe(
      "audio/notices/session-complete.mp3",
    );
    expect(listSessionNoticeCacheUrls()).toContain(
      "./audio/notices/drain-monobath.mp3",
    );
  });
});
