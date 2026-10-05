import type { CustomPremixProfile } from '@/lib/ingredient-nutrients';
import type { NutritionPhase } from '@/lib/nutrition';

export const PUBLIC_PREMIX_ID = 'public-premix-salt-additives';
export const PUBLIC_PREMIX_INCLUSION_PCT = 1;
export const PUBLIC_PREMIX_KG_PER_TONNE = 10;

export function publicPremixProfileForPhase(phase: NutritionPhase): CustomPremixProfile {
  const supplementation = phase.supplementation;
  if (!supplementation) {
    return {
      id: PUBLIC_PREMIX_ID,
      name: 'Vitamin-mineral premix',
      vitamins: {},
      traceMineralsPpm: {},
    };
  }

  // The source tables specify additions to finished feed. At a fixed 1%
  // inclusion, the premix itself must contain 100x each finished-feed target.
  const factor = 100 / PUBLIC_PREMIX_INCLUSION_PCT;
  const vitamins = supplementation.vitamins;
  const trace = supplementation.traceMinerals.inorganic;

  return {
    id: PUBLIC_PREMIX_ID,
    name: `Vitamin-mineral premix (${PUBLIC_PREMIX_KG_PER_TONNE} kg/t)`,
    vitamins: {
      vitaminAIuKg: vitamins.vitaminAIuKg * factor,
      vitaminDIuKg: vitamins.vitaminDIuKg * factor,
      vitaminEIuKg: vitamins.vitaminEIuKg * factor,
      vitaminKMgKg: vitamins.vitaminKMgKg * factor,
      vitaminB1MgKg: vitamins.vitaminB1MgKg * factor,
      riboflavinMgKg: vitamins.riboflavinMgKg * factor,
      vitaminB6MgKg: vitamins.vitaminB6MgKg * factor,
      vitaminB12McgKg: vitamins.vitaminB12McgKg * factor,
      pantothenicAcidMgKg: vitamins.pantothenicAcidMgKg * factor,
      niacinMgKg: vitamins.niacinMgKg * factor,
      folicAcidMgKg: vitamins.folicAcidMgKg * factor,
      biotinMgKg: vitamins.biotinMgKg * factor,
      totalCholineMgKg: vitamins.totalCholineMgKg * factor,
    },
    traceMineralsPpm: {
      zinc: trace.zincPpm * factor,
      iron: trace.ironPpm * factor,
      manganese: trace.manganesePpm * factor,
      copper: trace.copperPpm * factor,
      ...(trace.iodinePpm === undefined ? {} : { iodine: trace.iodinePpm * factor }),
      selenium: trace.seleniumPpm * factor,
    },
  };
}
