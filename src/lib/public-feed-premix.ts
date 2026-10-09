/**
 * RETIRED legacy ID for older saved data.
 * Never reconstruct a commercially nonexistent premix from phase requirements.
 * New formulations must select a real product from commercial-premixes.ts.
 */
import type { CustomPremixProfile } from '@/lib/ingredient-nutrients';
import type { NutritionPhase } from '@/lib/nutrition';

export const PUBLIC_PREMIX_ID = 'public-premix-salt-additives';
/** @deprecated No new formulation may use this artificial rate. */
export const PUBLIC_PREMIX_INCLUSION_PCT = 1;
/** @deprecated Kept only so saved legacy layouts can be interpreted. */
export const PUBLIC_PREMIX_KG_PER_TONNE = 10;
export const PUBLIC_PREMIX_NAME = 'RETIRED hypothetical FeedSport premix';

/** Legacy-only inert profile; it must NEVER satisfy micronutrient targets. */
export function publicPremixProfileForPhase(_phase: NutritionPhase): CustomPremixProfile {
  return {
    id: PUBLIC_PREMIX_ID,
    name: PUBLIC_PREMIX_NAME,
    vitamins: {},
    traceMineralsPpm: {},
  };
}
