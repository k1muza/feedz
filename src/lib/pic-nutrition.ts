/**
 * PIC mature-boar nutrition source data.
 *
 * Source:
 * - PIC Nutrition and Feeding Guidelines, Metric Version 2021.04.14
 * - Section F, Table F1 (reference feeding programme and 3,175 kcal ME/kg diet)
 * - Section M, M-1/M-2 (mature-boar nutrient specifications, as-fed)
 *
 * PIC publishes lysine and phosphorus relative to dietary energy rather than
 * one fixed concentration. PigFlow preserves those ratios so the target can be
 * resolved against either the ME or NE basis selected by the user.
 */
export const PIC_MATURE_BOAR_SOURCE = {
  publisher: "PIC",
  title: "PIC Nutrition and Feeding Guidelines",
  version: "Metric Version 2021.04.14",
  url: "https://www.pic.com/wp-content/uploads/sites/3/2021/03/PIC_Nutrition-Guidelines_English-Metric.pdf",
  sections: [
    "Section F — Mature Boar",
    "Table F1 — Feeding Level for Boars in Quarantine and Production",
    "Section M — PIC Nutrient Specifications for Mature Boars (As-Fed)",
  ],
} as const;

export const PIC_MATURE_BOAR = {
  id: "pic-mature-boar",
  name: "PIC — Mature Boar",
  sourceTable: "M-1/M-2",
  sourcePage: 71,
  sourceWeightKg: {
    min: 180,
    max: 340,
  },
  /**
   * Table F1 is based on 3,175 kcal ME/kg and assumes NE:ME = 0.75.
   * The nutrient specification table instructs users to adjust specifications
   * for dietary energy concentration.
   */
  dietEnergy: {
    metabolizableKcalKg: 3175,
    netKcalKg: 2381.25,
  },
  sidLysineGPerMcal: {
    ME: 1.95,
    NE: 2.64,
  },
  aminoAcidRatiosToLysPct: {
    methionineCysteine: 70,
    threonine: 74,
    tryptophan: 20,
    valine: 67,
    isoleucine: 58,
    leucine: 65,
    histidine: 30,
    phenylalanineTyrosine: 114,
  },
  phosphorusGPerMcal: {
    sttd: {
      ME: 1.38,
      NE: 1.87,
    },
    available: {
      ME: 1.31,
      NE: 1.78,
    },
  },
  minerals: {
    sodiumPct: 0.22,
    chloridePct: 0.22,
    analyzedCalciumToPhosphorusRatio: 1.5,
  },
  recommendedSpecifications: {
    neutralDetergentFibreMinPct: 11,
    linoleicAcidPct: 1.9,
    lLysineHclMaxPct: 0.25,
  },
  supplementation: {
    traceMineralsPpm: {
      zinc: 125,
      iron: 100,
      manganese: 50,
      copper: 15,
      iodine: 0.35,
      selenium: 0.3,
    },
    vitamins: {
      vitaminAIuKg: 9920,
      vitaminDIuKg: 1985,
      vitaminEIuKg: 66,
      vitaminKMgKg: 4.4,
      vitaminB1MgKg: 2.2,
      riboflavinMgKg: 10,
      vitaminB6MgKg: 3.3,
      vitaminB12McgKg: 37,
      pantothenicAcidMgKg: 33,
      niacinMgKg: 44,
      folicAcidMgKg: 1.325,
      biotinMgKg: 0.22,
      totalCholineMgKg: 660,
    },
  },
} as const;
