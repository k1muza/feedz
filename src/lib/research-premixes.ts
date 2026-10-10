/**
 * Research-reference premix, NOT a FeedSport manufactured/commercial product.
 * Source: Yang et al. (2019), Animals 9(12):1154, Table 2, VTM Premix 2.
 * https://doi.org/10.3390/ani9121154
 *
 * Concentrations represent the study's *formulated targets*, not a guaranteed
 * analysis or certificate of analysis. The paper studied storage stability and
 * explicitly describes nutrient losses over time.
 *
 * Important: The published 40,000 mg/kg is CHOLINE CHLORIDE, not 40,000 mg/kg
 * of elemental choline. Do not map it to totalCholineMgKg without establishing
 * the chemical composition and conversion basis.
 *
 * This research record deliberately does NOT enter COMMERCIAL_PREMIXES,
 * Studio's purchasable catalog, or automatic ingredient selection.
 * It requires technical review before real feeding or manufacturing.
 */
export const FEEDSPORT_RESEARCH_PIGLET_VTM = {
  id: "feedsport-research-piglet-vtm-1pct",
  name: "FeedSport MaxPro",
  category: "research_reference",
  species: "pig",
  application: "Weanling piglets only",
  source: {
    title: "Effects of Choline Chloride, Copper Sulfate and Zinc Oxide on Long-Term Stabilization of Microencapsulated Vitamins in Premixes for Weanling Piglets",
    authors: "Yang et al.",
    year: 2019,
    doi: "10.3390/ani9121154",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6941071/",
    table: "Table 2 — VTM Premix 2",
  },
  inclusionPct: 1,
  inclusionKgPerTonne: 10,
  valuesBasis: "formulated_study_target_not_supplier_guarantee",
  allowedForCommercialFormulation: false,
  vitamins: {
    vitaminAIuKg: 1_350_000,
    vitaminDIuKg: 300_000,
    vitaminEIuKg: 3_000,
    vitaminKMgKg: 300,
    vitaminB1MgKg: 300,
    riboflavinMgKg: 600,
    vitaminB6MgKg: 300,
    vitaminB12McgKg: 2_400,
    niacinMgKg: 3_000,
    pantothenicAcidMgKg: 1_800,
    folicAcidMgKg: 12,
    biotinMgKg: 3,
  },
  /** Compound declaration from the paper; not an elemental-choline guarantee. */
  cholineChlorideMgKg: 40_000,
  /** Reported trace-mineral amounts in mg/kg of research premix. */
  traceMineralsPpm: {
    copper: 500,
    iodine: 14,
    iron: 10_000,
    manganese: 300,
    selenium: 25,
    zinc: 8_000,
  },
  limitations: [
    "Research premix for weanling piglets, not a grower-finisher or sow premix.",
    "Not for sale, not a supplier formulation, and not batch-verified.",
    "Source quantities are nominal study formulations; vitamin retention declines during storage.",
    "Choline chloride quantity must not be represented as measured elemental or total choline.",
    "The study does not validate FeedSport's own manufacturing process or complete-feed recipe.",
  ],
} as const;
