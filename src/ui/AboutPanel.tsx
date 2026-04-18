import {
  BookIcon,
  FilmIcon,
  FlaskIcon,
  InfoIcon,
  WorkflowIcon
} from './icons';

export function AboutPanel() {
  return (
    <section className="stack">
      <div className="section-heading">
        <p className="eyebrow">About</p>
        <h2>
          <span className="title-with-icon title-with-icon--large">
            <InfoIcon aria-hidden="true" />
            <span>Who made this strange little thing?</span>
          </span>
        </h2>
        <p>
          A small note on where the app came from, who built it, and why a darkroom
          side project ended up as an installable web app.
        </p>
      </div>

      <section className="hero-block hero-block--guide">
        <div className="hero-block__intro">
          <p className="eyebrow">Origin Story</p>
          <h1>Vibe-coded between rinses, reels, and questionable life choices.</h1>
          <p className="lede">
            Film Dev was vibe-coded for fun between one darkroom session and another
            by Leonardo Fiori, a passionate film photographer who occasionally
            fustigates himself by shooting large format.
          </p>
        </div>
      </section>

      <div className="guide-grid">
        <article className="guide-card">
          <div className="guide-card__title">
            <span className="surface-icon surface-icon--row">
              <FilmIcon aria-hidden="true" />
            </span>
            <div>
              <h3>Who made it</h3>
              <p>Darkroom tinkering by a human, with the usual large-format self-inflicted pain.</p>
            </div>
          </div>
          <p className="soft-copy">
            Leonardo Fiori made this as a practical side project while developing film,
            with the very normal goal of making chemistry less annoying and timing less fragile.
          </p>
        </article>

        <article className="guide-card">
          <div className="guide-card__title">
            <span className="surface-icon surface-icon--row">
              <WorkflowIcon aria-hidden="true" />
            </span>
            <div>
              <h3>How it was built</h3>
              <p>Yes, this was unapologetically vibe-coded.</p>
            </div>
          </div>
          <p className="soft-copy">
            The app was built with Codex and GPT-5.4, powered by an unreasonable amount
            of prompting, revision, and “one more tiny tweak” energy.
          </p>
        </article>

        <article className="guide-card">
          <div className="guide-card__title">
            <span className="surface-icon surface-icon--row">
              <FlaskIcon aria-hidden="true" />
            </span>
            <div>
              <h3>Why it exists</h3>
              <p>Because a darkroom app should guide the whole process, not just shout numbers at you.</p>
            </div>
          </div>
          <ul className="bullet-list">
            <li>Recipe guidance for color and black-and-white workflows</li>
            <li>Timing changes for reuse, push, pull, and temperature drift</li>
            <li>Offline-first behavior for actual wet-handed darkroom use</li>
          </ul>
        </article>

        <article className="guide-card">
          <div className="guide-card__title">
            <span className="surface-icon surface-icon--row">
              <BookIcon aria-hidden="true" />
            </span>
            <div>
              <h3>Portfolio, if you insist</h3>
              <p>The portfolio is a little dusty, but it exists.</p>
            </div>
          </div>
          <p className="soft-copy">
            If you want to see what Leonardo shoots when not arguing with chemistry,
            the slightly outdated portfolio lives at{' '}
            <a
              className="inline-link"
              href="https://leonardofiori.it"
              target="_blank"
              rel="noreferrer"
            >
              leonardofiori.it
            </a>
            .
          </p>
        </article>
      </div>

      <section className="panel stack">
        <div className="panel-heading">
          <h3>
            <span className="title-with-icon">
              <InfoIcon aria-hidden="true" />
              <span>One more thing</span>
            </span>
          </h3>
          <p>
            This app was made for fun, but the hope is serious: that it ends up being
            useful to the film community and saves a few rolls from avoidable mistakes.
          </p>
        </div>
      </section>
    </section>
  );
}
