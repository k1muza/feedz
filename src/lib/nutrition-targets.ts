import type { NutritionPhase } from "./nutrition";

export type EnergySystem = "ME" | "NE";

export type DietEnergy = {
  system: EnergySystem;
  kcalKg: number;
};

export type ResolvedAminoAcidTargets = {
  sidLysinePct: number;
  sidMethionineCysteinePct: number;
  sidThreoninePct: number;
  sidTryptophanPct: number;
  sidValinePct: number;
  sidIsoleucinePct: number;
  sidLeucinePct: number;
  sidHistidinePct: number;
  sidPhenylalanineTyrosinePct: number;
};

export type ResolvedMineralTargets = {
  calciumPct?: number;
  sttdPhosphorusPct?: number;
  availablePhosphorusPct?: number;
  sodiumPct: number;
  chloridePct?: number;
};

export type ResolvedNutritionTargets = {
  phaseId: string;
  energy: DietEnergy;
  crudeProteinPct?: number;
  digestibleProteinPct?: number;
  potassiumPct?: number;
  linoleicAcidPct?: number;
  aminoAcids: ResolvedAminoAcidTargets;
  minerals: ResolvedMineralTargets;
};

/**
 * Normalize one Brazilian Tables phase into the target shape consumed by the
 * formulation evaluator.
 *
 * The Brazilian Tables publish diet energy and SID amino-acid concentrations
 * directly for the loaded Chapter 5 and Chapter 6 phases, so no nutrient-per-Mcal
 * conversion is performed here.
 */
export function resolveNutritionTargets(
  phase: NutritionPhase,
  energy?: DietEnergy,
): ResolvedNutritionTargets {
  const publishedEnergy: DietEnergy =
    energy ?? {
      system: "ME",
      kcalKg: phase.requirements.metabolizableEnergyKcalKg,
    };
  assertEnergy(publishedEnergy);

  const sid = phase.requirements.sidAminoAcidsPct;
  const ratios = phase.requirements.aminoAcids;
  const relative = phase.requirements.energyRelative;
  const relativeLysine = relative?.sidLysineGPerMcal?.[publishedEnergy.system];
  const sidLysinePct =
    relativeLysine === undefined
      ? sid.lysine
      : (relativeLysine * publishedEnergy.kcalKg) / 10000;
  const aminoPct = (ratioPct: number) => sidLysinePct * (ratioPct / 100);
  const sttdRelative = relative?.sttdPhosphorusGPerMcal?.[publishedEnergy.system];
  const availableRelative =
    relative?.availablePhosphorusGPerMcal?.[publishedEnergy.system];

  return {
    phaseId: phase.id,
    energy: publishedEnergy,
    crudeProteinPct: phase.requirements.crudeProteinPct,
    digestibleProteinPct: phase.requirements.digestibleProteinPct,
    potassiumPct: phase.requirements.potassiumPct,
    linoleicAcidPct: phase.requirements.linoleicAcidPct,
    aminoAcids: {
      sidLysinePct,
      sidMethionineCysteinePct:
        relativeLysine === undefined
          ? sid.methionineCysteine
          : aminoPct(ratios.methionineCysteineToLysPct),
      sidThreoninePct:
        relativeLysine === undefined
          ? sid.threonine
          : aminoPct(ratios.threonineToLysPct),
      sidTryptophanPct:
        relativeLysine === undefined
          ? sid.tryptophan
          : aminoPct(ratios.tryptophanToLysPct),
      sidValinePct:
        relativeLysine === undefined
          ? sid.valine
          : aminoPct(ratios.valineToLysPct),
      sidIsoleucinePct:
        relativeLysine === undefined
          ? sid.isoleucine
          : aminoPct(ratios.isoleucineToLysPct),
      sidLeucinePct:
        relativeLysine === undefined
          ? sid.leucine
          : aminoPct(ratios.leucineToLysPct),
      sidHistidinePct:
        relativeLysine === undefined
          ? sid.histidine
          : aminoPct(ratios.histidineToLysPct),
      sidPhenylalanineTyrosinePct:
        relativeLysine === undefined
          ? sid.phenylalanineTyrosine
          : aminoPct(ratios.phenylalanineTyrosineToLysPct),
    },
    minerals: {
      calciumPct: phase.requirements.minerals.calciumPct,
      sttdPhosphorusPct:
        sttdRelative === undefined
          ? phase.requirements.minerals.sttdPhosphorusPct
          : (sttdRelative * publishedEnergy.kcalKg) / 10000,
      availablePhosphorusPct:
        availableRelative === undefined
          ? phase.requirements.minerals.availablePhosphorusPct
          : (availableRelative * publishedEnergy.kcalKg) / 10000,
      sodiumPct: phase.requirements.minerals.sodiumPct,
      chloridePct: phase.requirements.minerals.chloridePct,
    },
  };
}

function assertEnergy(energy: DietEnergy): void {
  if (!Number.isFinite(energy.kcalKg) || energy.kcalKg <= 0) {
    throw new Error("Diet energy must be a positive finite number.");
  }
}
