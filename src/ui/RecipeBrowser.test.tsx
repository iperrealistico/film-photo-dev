// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { RecipeDefinition } from '../domain/types';
import { RecipeBrowser } from './RecipeBrowser';

function createRecipe(index: number): RecipeDefinition {
  return {
    id: `recipe-${index}`,
    name: `Recipe ${index}`,
    developerLabel: `Developer ${index}`,
    subtitle: `Subtitle ${index}`,
    description: `Description ${index}`,
    processType: index % 2 === 0 ? 'color' : 'bw',
    family: index % 3 === 0 ? 'monobath' : index % 2 === 0 ? 'color_kit' : 'bw_concentrate',
    source: {
      id: `source-${index}`,
      title: `Source ${index}`,
      label: index % 2 === 0 ? 'Manufacturer' : 'Curated',
      kind: index % 2 === 0 ? 'manufacturer' : 'curated',
      accessedAt: '2026-04-18'
    },
    accentTone: index % 2 === 0 ? 'ember' : 'amber',
    notes: [],
    inputs: [],
    plannerId: index % 3 === 0 ? 'df96' : index % 2 === 0 ? 'cs41' : 'hc110'
  };
}

describe('RecipeBrowser', () => {
  it('shows recipes in pages of three and keeps the guide below the recipe list', async () => {
    const user = userEvent.setup();
    const recipes = Array.from({ length: 5 }, (_, index) => createRecipe(index + 1));
    const onSelect = vi.fn();

    render(
      <RecipeBrowser
        recipes={recipes}
        selectedRecipeId={recipes[0].id}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByRole('button', { name: /Recipe 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Recipe 2/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Recipe 3/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Recipe 4/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Showing 1-3 of 5 recipes/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Next$/i }));

    expect(screen.queryByRole('button', { name: /Recipe 1/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Recipe 4/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Recipe 5/i })).toBeInTheDocument();
    expect(screen.getByText(/Page 2 of 2/i)).toBeInTheDocument();

    const recipeButton = screen.getByRole('button', { name: /Recipe 4/i });
    const guideHeading = screen.getByRole('heading', {
      name: /Film developing, guided step by step/i
    });

    expect(
      recipeButton.compareDocumentPosition(guideHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Install it on your phone/i })).toBeInTheDocument();
    expect(screen.getByText(/Works online and offline/i)).toBeInTheDocument();
  });
});
