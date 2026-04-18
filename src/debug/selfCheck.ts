import { defaultAlertProfiles, recipes } from '../data/recipes';
import { createDefaultInputState, createSessionPlan } from '../domain/planner';
import { logDebugEvent } from './logging';

let hasRun = false;

export function runSelfCheck() {
  if (hasRun || import.meta.env.PROD) {
    return;
  }

  hasRun = true;

  console.assert(recipes.length >= 3, 'Expected at least three sample recipes.');
  console.assert(
    defaultAlertProfiles.length >= 2,
    'Expected multiple alert profiles.',
  );

  for (const recipe of recipes) {
    const plan = createSessionPlan(
      recipe.id,
      createDefaultInputState(recipe),
      defaultAlertProfiles[0],
    );

    console.assert(plan.phaseList.length > 0, `${recipe.id} should create phases.`);
    console.assert(plan.totalDurationSec > 0, `${recipe.id} should have duration.`);
  }

  logDebugEvent({
    category: 'app',
    event: 'self_check_completed',
    detail: {
      recipeCount: recipes.length,
      alertProfiles: defaultAlertProfiles.length
    }
  });
}
