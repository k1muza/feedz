/**
 * FeedSport WeanerPro — provisional on-pack label transcription only.
 *
 * Physical source: user-supplied photograph of "PIG WEANER" bag from
 * Irvine's Africa Exports / AECI Animal Health (registration V1736,
 * Act No. 36/1947; labelled manufacturer Chanka Fine Chemicals, SA Premix).
 *
 * The photo specifies 10 kg per 1 tonne of finished feed. The nutrient table
 * includes two numerical columns WITHOUT legible unit/basis headings. Thus the
 * printed numbers must NOT be interpreted as IU/kg, mg/kg or kg/tonne.
 *
 * This is an attribution/reference record, NOT a FeedSport-produced product
 * or a verified premix nutrient matrix. It must not be offered for optimization
 * until the manufacturer clarifies column definitions, measurement basis and
 * identity of choline and other source compounds.
 */
export const FEEDSPORT_RESEARCH_PIGLET_VTM = {
  // Retain the existing ID to keep saved formulation references resolvable.
  id: "feedsport-research-piglet-vtm-1pct",
  name: "FeedSport WeanerPro",
  category: "research_reference",
  species: "pig",
  application: "Pig weaner; manufacturer label does not specify a live-weight band",
  source: {
    title: "Pig Weaner — bag nutrient specification (photograph supplied by user)",
    authors: "AECI Animal Health / Irvine's Africa Exports",
    year: 2025,
    doi: "",
    // Internal transcript and provenance notes, NOT an original manufacturer PDF.
    url: "https://github.com/k1muza/feedz/blob/main/src/lib/research-premixes.ts",
    table: "PIG WEANER label; registration V1736, Act 36/1947",
  },
  inclusionPct: 1,
  inclusionKgPerTonne: 10,
  valuesBasis: "printed_label_columns_units_and_basis_unconfirmed",
  allowedForCommercialFormulation: false,
  /** NO values are credited to the optimizer until their units and basis are confirmed. */
  vitamins: {},
  traceMineralsPpm: {},
  /** Literal on-pack first-column transcription. Unit, denominator and the
   * second column's role have NOT been established; these are NOT engine data.
   * Suspect/unclear rows are omitted rather than silently repaired.
   */
  photographedLabel: {
    productName: "PIG WEANER",
    distributor: "Irvine's Africa Exports",
    brandOnLabel: "AECI Animal Health",
    registration: "V1736 (Act No. 36/1947)",
    declaredInclusion: "10Kgs Per 1 Tonne Of Final Feed",
    leftColumnBasis: "unknown",
    rightColumnBasis: "unknown",
    declaredRows: [
      { name: "Vitamin A", firstColumn: "5.000.000" },
      { name: "Vitamin D3", firstColumn: "2.000.000" },
      { name: "Vitamin E (DL)", firstColumn: "10.000" },
      { name: "Vitamin B4 (Choline)", firstColumn: "0.0000" },
      { name: "Vitamin B3 (Niacin)", firstColumn: "15.0000" },
      { name: "Vitamin B2", firstColumn: "3.0000" },
      { name: "Vitamin B6 (Pyridoxine)", firstColumn: "1.00" },
      { name: "Vitamin B1", firstColumn: "1.5000" },
      { name: "Vitamin K3", firstColumn: "0.3000" },
      { name: "Vitamin H (D-Biotin)", firstColumn: "0.0000" },
      { name: "Vitamin B12", firstColumn: "0.0150" },
      { name: "Vitamin C (Ascorbic Acid)", firstColumn: "0.0000" },
      { name: "Zinc (zinc oxide)", firstColumn: "30.000" },
      { name: "Manganese (oxide)", firstColumn: "15.000" },
      { name: "Iron (iron sulphate)", firstColumn: "25.0000" },
      { name: "Copper (copper sulphate)", firstColumn: "1.0000" },
      { name: "Magnesium (oxide)", firstColumn: "0.0000" },
      { name: "Iodine", firstColumn: "0.3000" },
      { name: "Sodium", firstColumn: "0.000" },
      { name: "L-Threonine", firstColumn: "98.5%" },
      { name: "Phytase", firstColumn: "10000" },
    ],
    missingOrAmbiguousRows: [
      "Vitamin B9: numeric value unclear on the photograph",
      "Magnesium/L-lysine area: row alignment and numeric meaning unclear",
      "Second numeric column: may represent a different measure or ingredient grade; no headers visible",
      "No unambiguous selenium, pantothenic acid, or vitamin activity basis could be established",
    ],
  },
  limitations: [
    "This is an AECI/Irvine's Pig Weaner bag label, not a formula developed or manufactured by FeedSport.",
    "The label's two numerical columns and units cannot be unambiguously interpreted from the photograph.",
    "A printed zero is not a verified absence of that nutrient; missing source values remain unknown.",
    "The earlier Yang et al. (2019) research matrix has been removed; do not mix its values with this label.",
    "Not selectable for formulation until the manufacturer supplies a complete as-fed specification with units and definitions.",
    "Do not manufacture or feed using this provisional transcription.",
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
    // The photographed AECI label lacks a verified nutrient matrix and live-weight range.
    return false;
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
