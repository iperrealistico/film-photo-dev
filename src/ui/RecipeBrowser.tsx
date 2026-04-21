import { useDeferredValue, useEffect, useState } from 'react';
import type { RecipeDefinition } from '../domain/types';
import {
  BookIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  FilmIcon,
  FlaskIcon,
  LayersIcon,
  OfflineIcon,
  SearchIcon,
  ShieldIcon,
  SmartphoneIcon
} from './icons';

interface RecipeBrowserProps {
  recipes: RecipeDefinition[];
  selectedRecipeId: string;
  onSelect: (recipeId: string) => void;
}

const familyLabelMap: Record<RecipeDefinition['family'], string> = {
  color_kit: 'Color kit',
  bw_concentrate: 'B/W concentrate',
  monobath: 'Monobath'
};

const recipesPerPage = 3;

export function RecipeBrowser({
  recipes,
  selectedRecipeId,
  onSelect
}: RecipeBrowserProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const deferredSearch = useDeferredValue(search);
  const loweredSearch = deferredSearch.trim().toLowerCase();
  const filteredRecipes = recipes.filter((recipe) => {
    if (!loweredSearch) {
      return true;
    }

    return [recipe.name, recipe.developerLabel, recipe.subtitle, recipe.processType]
      .join(' ')
      .toLowerCase()
      .includes(loweredSearch);
  });
  const totalPages = Math.max(1, Math.ceil(filteredRecipes.length / recipesPerPage));
  const currentPage = Math.min(page, totalPages - 1);
  const pageStart = currentPage * recipesPerPage;
  const pagedRecipes = filteredRecipes.slice(pageStart, pageStart + recipesPerPage);

  useEffect(() => {
    setPage(0);
  }, [loweredSearch]);

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  return (
    <section className="stack">
      <div className="recipe-browser-top stack">
        <label className="field-shell search-shell">
          <span className="field-label">
            <span className="title-with-icon title-with-icon--compact">
              <SearchIcon aria-hidden="true" />
              <span>Find a recipe</span>
            </span>
          </span>
          <input
            className="field-input"
            placeholder="Search film, chemistry, or process"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <div className="recipe-browser-toolbar">
          <p className="soft-copy">
            {filteredRecipes.length === 0
              ? 'No matching recipes.'
              : `Showing ${pageStart + 1}-${Math.min(filteredRecipes.length, pageStart + recipesPerPage)} of ${filteredRecipes.length} recipes`}
          </p>
          {totalPages > 1 ? (
            <div className="pager-controls" aria-label="Recipe pages">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                disabled={currentPage === 0}
              >
                <span className="button-label">
                  <ChevronLeftIcon aria-hidden="true" />
                  <span>Previous</span>
                </span>
              </button>
              <span className="pager-status">
                Page {currentPage + 1} of {totalPages}
              </span>
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setPage((current) => Math.min(totalPages - 1, current + 1))
                }
                disabled={currentPage >= totalPages - 1}
              >
                <span className="button-label">
                  <span>Next</span>
                  <ChevronRightIcon aria-hidden="true" />
                </span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="recipe-list">
        {pagedRecipes.length === 0 ? (
          <section className="panel stack">
            <div className="panel-heading">
              <h2>
                <span className="title-with-icon">
                  <SearchIcon aria-hidden="true" />
                  <span>No recipes found</span>
                </span>
              </h2>
              <p>Try a different film, chemistry, or process name.</p>
            </div>
          </section>
        ) : null}
        {pagedRecipes.map((recipe) => {
          const isActive = recipe.id === selectedRecipeId;

          return (
            <button
              key={recipe.id}
              type="button"
              className={`recipe-strip ${isActive ? 'is-active' : ''}`}
              onClick={() => onSelect(recipe.id)}
            >
              <div className="recipe-strip__main">
                <div className="recipe-strip__labels">
                  <span className={`tone-chip tone-chip--${recipe.accentTone}`}>
                    {recipe.processType === 'color' ? 'Color' : 'B&W'}
                  </span>
                  <span className="source-chip">{recipe.source.label}</span>
                </div>
                <h2>
                  <span className="title-with-icon title-with-icon--large">
                    <FilmIcon aria-hidden="true" />
                    <span>{recipe.name}</span>
                  </span>
                </h2>
                <p>{recipe.subtitle}</p>
              </div>
              <div className="recipe-strip__meta">
                <span className="title-with-icon title-with-icon--compact">
                  <FlaskIcon aria-hidden="true" />
                  <span>{recipe.developerLabel}</span>
                </span>
                <strong className="title-with-icon title-with-icon--compact">
                  <LayersIcon aria-hidden="true" />
                  <span>{familyLabelMap[recipe.family]}</span>
                </strong>
              </div>
            </button>
          );
        })}
      </div>

      <section className="hero-block hero-block--guide">
        <div className="hero-block__intro">
          <p className="eyebrow">What This App Does</p>
          <h1>
            <span className="title-with-icon title-with-icon--hero">
              <BookIcon aria-hidden="true" />
              <span>Film developing, guided step by step.</span>
            </span>
          </h1>
          <p className="lede">
            This is a web app you can use online or offline. It helps with more
            than countdowns: recipes, mix math, timing adjustments, and guided
            session flow are all kept in one place.
          </p>
        </div>

        <div className="guide-grid">
          <article className="guide-card">
            <div className="guide-card__title">
              <span className="surface-icon surface-icon--row">
                <ClockIcon aria-hidden="true" />
              </span>
              <h2>Built for real darkroom use</h2>
            </div>
            <ul className="bullet-list">
              <li>Guides each step of the process instead of acting like a simple timer.</li>
              <li>Applies source-backed timing changes for reuse, push, pull, and temperature across the supported recipes.</li>
              <li>Keeps mix calculations, warnings, and the next action easy to read.</li>
            </ul>
          </article>

          <article className="guide-card">
            <div className="guide-card__title">
              <span className="surface-icon surface-icon--row">
                <OfflineIcon aria-hidden="true" />
              </span>
              <h2>Works online and offline</h2>
            </div>
            <ul className="bullet-list">
              <li>Opens in the browser like a normal website.</li>
              <li>Can also run as an installable app on iPhone or Android.</li>
              <li>Keeps working offline once it has been installed and cached.</li>
            </ul>
          </article>

          <article className="guide-card">
            <div className="guide-card__title">
              <span className="surface-icon surface-icon--row">
                <SmartphoneIcon aria-hidden="true" />
              </span>
              <h2>Install it on your phone</h2>
            </div>
            <div className="guide-install-grid">
              <div>
                <h3>iPhone / iPad</h3>
                <ol className="bullet-list bullet-list--ordered">
                  <li>Open the site in Safari.</li>
                  <li>Tap Share, then choose Add to Home Screen.</li>
                  <li>Launch it from the Home Screen for the best offline experience.</li>
                </ol>
              </div>
              <div>
                <h3>Android</h3>
                <ol className="bullet-list bullet-list--ordered">
                  <li>Open the site in Chrome or another supported browser.</li>
                  <li>Use Install App or Add to Home Screen.</li>
                  <li>Open it like a normal app when you are in the darkroom.</li>
                </ol>
              </div>
            </div>
          </article>

          <article className="guide-card">
            <div className="guide-card__title">
              <span className="surface-icon surface-icon--row">
                <ShieldIcon aria-hidden="true" />
              </span>
              <h2>Reference and trust</h2>
            </div>
            <ul className="bullet-list">
              <li>Uses source-backed recipe data where available.</li>
              <li>For approved B/W combinations, the app can reference the Massive Dev Chart.</li>
              <li>Shows recipe provenance so you can see what the timing is based on.</li>
            </ul>
          </article>
        </div>
      </section>
    </section>
  );
}
