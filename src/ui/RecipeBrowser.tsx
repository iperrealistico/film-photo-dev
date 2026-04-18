import { useDeferredValue, useState } from 'react';
import type { RecipeDefinition } from '../domain/types';

interface RecipeBrowserProps {
  recipes: RecipeDefinition[];
  selectedRecipeId: string;
  onSelect: (recipeId: string) => void;
}

export function RecipeBrowser({
  recipes,
  selectedRecipeId,
  onSelect
}: RecipeBrowserProps) {
  const [search, setSearch] = useState('');
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

  return (
    <section className="stack">
      <div className="hero-block">
        <p className="eyebrow">Offline-first darkroom console</p>
        <h1>One app for color and B&W, without the single-file chaos.</h1>
        <p className="lede">
          Start with a source-labeled recipe, preview the full timeline, then
          drop into a wet-handed runtime view that keeps the next action obvious.
        </p>
      </div>

      <label className="field-shell search-shell">
        <span className="field-label">Find a recipe</span>
        <input
          className="field-input"
          placeholder="Search by chemistry, family, or process"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>

      <div className="recipe-list">
        {filteredRecipes.map((recipe) => {
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
                <h2>{recipe.name}</h2>
                <p>{recipe.subtitle}</p>
              </div>
              <div className="recipe-strip__meta">
                <span>{recipe.developerLabel}</span>
                <strong>{recipe.family.replace('_', ' ')}</strong>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
