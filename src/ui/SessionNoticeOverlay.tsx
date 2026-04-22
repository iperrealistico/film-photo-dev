import type { CSSProperties } from "react";
import type { SessionNoticeSpec } from "../app/sessionNotices";

interface SessionNoticeOverlayProps {
  notice: SessionNoticeSpec;
  sequence: number;
  animationsEnabled: boolean;
}

export function SessionNoticeOverlay({
  notice,
  sequence,
  animationsEnabled,
}: SessionNoticeOverlayProps) {
  return (
    <section
      key={sequence}
      className={[
        "session-notice-overlay",
        animationsEnabled ? "is-animated" : "is-static",
      ].join(" ")}
      style={
        {
          "--session-notice-duration": `${notice.durationMs}ms`,
        } as CSSProperties
      }
      aria-live="assertive"
      aria-atomic="true"
      role="status"
    >
      <div className="session-notice-overlay__backdrop" />
      <div className="session-notice-overlay__content">
        <p className="session-notice-overlay__eyebrow">Darkroom notice</p>
        <strong className="session-notice-overlay__headline">
          {notice.headline}
        </strong>
      </div>
    </section>
  );
}
