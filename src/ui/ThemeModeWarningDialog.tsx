import { useEffect, useRef } from "react";
import { MoonIcon, ShieldIcon, SmartphoneIcon, WarningIcon } from "./icons";

interface ThemeModeWarningDialogProps {
  onDismiss: () => void;
}

export function ThemeModeWarningDialog({
  onDismiss,
}: ThemeModeWarningDialogProps) {
  const dismissButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    dismissButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onDismiss();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDismiss]);

  return (
    <div className="theme-warning-dialog" role="presentation">
      <button
        type="button"
        className="theme-warning-dialog__backdrop"
        aria-label="Dismiss red safe warning"
        onClick={onDismiss}
      />

      <section
        className="theme-warning-dialog__surface"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="theme-warning-title"
        aria-describedby="theme-warning-description"
      >
        <div className="panel-heading">
          <p className="eyebrow">Red safe warning</p>
          <h2 id="theme-warning-title">
            <span className="title-with-icon">
              <WarningIcon aria-hidden="true" />
              <span>Some device UI will stay outside the red tint</span>
            </span>
          </h2>
          <p id="theme-warning-description">
            Some browser and operating-system UI elements keep their own colors,
            and the device interface itself cannot be tinted red by this app.
            Use red safe mode carefully and reduce your screen brightness before
            you start.
          </p>
        </div>

        <div className="theme-warning-dialog__tip-grid">
          <section className="theme-warning-dialog__tip-card">
            <h3>
              <span className="title-with-icon title-with-icon--compact">
                <ShieldIcon aria-hidden="true" />
                <span>Use with caution</span>
              </span>
            </h3>
            <ul className="bullet-list">
              <li>Browser chrome, system overlays, and other device UI can still appear in their normal colors.</li>
              <li>Lower your brightness as much as you comfortably can before handling film.</li>
            </ul>
          </section>

          <section className="theme-warning-dialog__tip-card">
            <h3>
              <span className="title-with-icon title-with-icon--compact">
                <SmartphoneIcon aria-hidden="true" />
                <span>Helpful iPhone settings</span>
              </span>
            </h3>
            <ul className="bullet-list">
              <li>Enable Color Filters to tint the entire screen red.</li>
              <li>Use Reduce White Point to make bright whites less harsh.</li>
              <li>Switch the iPhone appearance to Dark.</li>
              <li>Enable Focus or full immersion to cut distractions and notifications.</li>
            </ul>
          </section>
        </div>

        <div className="theme-warning-dialog__actions">
          <button
            ref={dismissButtonRef}
            type="button"
            className="primary-button"
            onClick={onDismiss}
          >
            <span className="button-label">
              <MoonIcon aria-hidden="true" />
              <span>Continue in red safe</span>
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
