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
 * This research record deliberately does NOT enter COMMERCIAL_PREMIXES or
 * automatic ingredient selection. Studio may expose it as an explicitly
 * labelled research-reference choice, never as a purchasable product.
 * It requires technical review before real feeding or manufacturing.
 */
export const FEEDSPORT_RESEARCH_PIGLET_VTM = {
  id: "feedsport-research-piglet-vtm-1pct",
  name: "FeedSport WeanerPro",
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


/**
 * Sampath et al. (2023), Frontiers in Veterinary Science, Table 2 and notes a/b:
 * https://doi.org/10.3389/fvets.2023.1095877
 *
 * Both the vitamin and mineral notes report contributions PER KG OF FINISHED
 * DIET, not guaranteed concentrations in the premix. The combined premix
 * inclusion differs by phase. The quantities below are thus reverse-calculated
 * RESEARCH TARGETS (not a manufacturer formulation, laboratory analysis, or
 * proven storage-stable material).
 *
 * Choline chloride 50% is added SEPARATELY in Table 2 and is not part of either
 * derived premix. AZn and other experimental treatments must not be conflated
 * with this baseline premix.
 */
const SAMPATH_2023_SOURCE = {
  title: "Enhancement of protective vaccine-induced antibody titer to swine diseases and growth performance by Amino-Zn, yucca extract, and β-mannanase feed additive in wean-finishing pigs",
  authors: "Sampath et al.",
  year: 2023,
  doi: "10.3389/fvets.2023.1095877",
  url: "https://www.frontiersin.org/journals/veterinary-science/articles/10.3389/fvets.2023.1095877/full",
  table: "Table 2; footnotes a and b",
} as const;

const SAMPATH_FINISHED_DIET_SUPPLEMENTATION = {
  vitamins: {
    vitaminAIuKg: 10_800,
    vitaminDIuKg: 4_000,
    vitaminEIuKg: 40,
    vitaminKMgKg: 4,
    vitaminB1MgKg: 6,
    riboflavinMgKg: 12,
    vitaminB6MgKg: 6,
    vitaminB12McgKg: 50, // paper says 0.05 mg/kg of diet
    biotinMgKg: 0.2,
    folicAcidMgKg: 2,
    niacinMgKg: 50,
    // Paper specifies 25 mg D-calcium pantothenate, not pantothenic acid.
  },
  traceMineralsPpm: {
    iron: 100, copper: 17, manganese: 17, zinc: 100,
    iodine: 0.5, selenium: 0.3,
  },
  dCalciumPantothenateMgKg: 25,
} as const;

/** Reverse a reported finished-feed supplementation level using the phase dose. */
function deriveSampathPremix(inclusionPct: number) {
  const factor = 100 / inclusionPct;
  return {
    vitamins: Object.fromEntries(Object.entries(SAMPATH_FINISHED_DIET_SUPPLEMENTATION.vitamins)
      .map(([key, amount]) => [key, amount * factor])),
    traceMineralsPpm: Object.fromEntries(Object.entries(SAMPATH_FINISHED_DIET_SUPPLEMENTATION.traceMineralsPpm)
      .map(([key, amount]) => [key, amount * factor])),
    dCalciumPantothenateMgKg: SAMPATH_FINISHED_DIET_SUPPLEMENTATION.dCalciumPantothenateMgKg * factor,
  };
}

function sampathReference(
  id: string,
  name: string,
  application: string,
  inclusionPct: number,
  cholineChloride50PctOfFinishedFeed: number,
) {
  return {
    id,
    name,
    category: "research_reference" as const,
    species: "pig" as const,
    application,
    source: SAMPATH_2023_SOURCE,
    inclusionPct,
    inclusionKgPerTonne: inclusionPct * 10,
    valuesBasis: "derived_from_published_finished_diet_supplementation" as const,
    allowedForCommercialFormulation: false as const,
    ...deriveSampathPremix(inclusionPct),
    separateSupplement: {
      name: "Choline chloride 50% (separately added)",
      inclusionPctOfFinishedFeed: cholineChloride50PctOfFinishedFeed,
      kgPerTonne: Math.round(cholineChloride50PctOfFinishedFeed * 1_000) / 100,
      includedInPremix: false as const,
    },
    limitations: [
      "Derived mathematical reference, not a manufactured or supplier-guaranteed premix.",
      "Phase doses and nutrient targets come from a 2023 research diet, not Brazilian Tables requirements.",
      "The separate choline chloride 50% dose is not included in this premix.",
      "D-calcium pantothenate is retained as a source compound, not treated as exact pantothenic acid.",
      "Check trace-mineral upper limits, appropriate chemical forms, stability, mixing accuracy, and the entire basal diet before animal use.",
      "Not available for commercial formulation or complete-feed claims.",
    ],
  };
}

export const FEEDSPORT_GROWER_PRO = sampathReference(
  "feedsport-growerpro-research-2023",
  "FeedSport GrowerPro",
  "Growing pigs — study weeks 6–12, approximate weight unspecified",
  0.4,
  0.09,
);

/** The study has TWO finisher phases with different premix and choline doses. */
export const FEEDSPORT_FINISHER_PRO = [
  sampathReference(
    "feedsport-finisherpro-phase1-research-2023",
    "FeedSport FinisherPro — Phase 1",
    "Finishing pigs — study weeks 12–18",
    0.35,
    0.09,
  ),
  sampathReference(
    "feedsport-finisherpro-phase2-research-2023",
    "FeedSport FinisherPro — Phase 2",
    "Finishing pigs — study weeks 18–24",
    0.4,
    0.1,
  ),
] as const;

export const FEEDSPORT_RESEARCH_PREMIXES = [
  FEEDSPORT_RESEARCH_PIGLET_VTM,
  FEEDSPORT_GROWER_PRO,
  ...FEEDSPORT_FINISHER_PRO,
] as const;

export type FeedSportResearchPremix = (typeof FEEDSPORT_RESEARCH_PREMIXES)[number];

const GROW_FINISH_PROGRAMME_PREFIXES = [
  "grow-finish-pig",
  "growing-barrows",
  "growing-entire-immunocastrated-males",
  "developing-gilt",
] as const;

export function researchPremixById(id: string): FeedSportResearchPremix | undefined {
  return FEEDSPORT_RESEARCH_PREMIXES.find((premix) => premix.id === id);
}

/**
 * Research diet periods are matched to the corresponding Brazilian Tables
 * age bands. No research profile is inferred beyond the published periods.
 */
export function researchPremixCompatibleWithPhase(
  premix: FeedSportResearchPremix,
  programmeId: string,
  phaseId: string,
): boolean {
  if (premix.id === FEEDSPORT_RESEARCH_PIGLET_VTM.id) {
    return programmeId.startsWith("nursery-pig");
  }
  if (!GROW_FINISH_PROGRAMME_PREFIXES.some((prefix) => programmeId.startsWith(prefix))) return false;
  if (premix.id === FEEDSPORT_GROWER_PRO.id) return /-63-91d-/.test(phaseId);
  if (premix.id === FEEDSPORT_FINISHER_PRO[0].id) return /-91-119d-/.test(phaseId);
  if (premix.id === FEEDSPORT_FINISHER_PRO[1].id) return /-119-147d-/.test(phaseId);
  return false;
}

export function eligibleResearchPremixes(programmeId: string, phaseId: string): FeedSportResearchPremix[] {
  return FEEDSPORT_RESEARCH_PREMIXES.filter((premix) =>
    researchPremixCompatibleWithPhase(premix, programmeId, phaseId));
}

/** Canonical nutrient profile used by Studio and both formulation APIs. */
export function researchPremixNutrientProfile(premix: FeedSportResearchPremix) {
  return {
    id: premix.id,
    name: premix.name,
    vitamins: premix.vitamins,
    traceMineralsPpm: premix.traceMineralsPpm,
    source: {
      publisher: premix.source.authors,
      title: premix.source.title,
      year: premix.source.year,
      url: premix.source.url,
      basis: "as-fed",
      priority: "primary" as const,
      note: `${premix.source.table}. Research-derived target; not a supplier guarantee.`,
    },
    notes: [...premix.limitations],
  };
}
