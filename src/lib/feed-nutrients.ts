// The nutrients FeedSport knows about: one entry per nutrient, with its id,
// names, unit and what it means. Everything else refers to a nutrient by this
// id: programme requirements (studio-programmes.ts), the nutrient reference
// pages, and the optimiser through `constraintId`. Plain data, safe for the
// browser.

export type NutrientGroup =
  | "Energy & protein"
  | "Amino acids"
  | "Macro minerals"
  | "Fibre"
  | "Fatty acids"
  | "Trace minerals"
  | "Vitamins";

/** Plain-language reference text, shown on the nutrient pages. */
export type NutrientGuide = {
  /** Lower-case name for sentences: "the cheapest way to buy lysine". */
  noun: string;
  /** One line for lists. */
  summary: string;
  /** How the value is expressed. */
  measured: string;
  role: string;
  tooLow: string;
  tooHigh: string;
};

export type FeedNutrient = {
  id: string;
  name: string;
  shortName: string;
  group: NutrientGroup;
  units: readonly string[];
  description: string;
  formulationRole: string;
  /**
   * How programmes publish it: energy as a target, other Chapter 5 nutrients as
   * a minimum, trace minerals as Chapter 7 suggested supplementation (advisory,
   * never an optimiser constraint). Absent when no programme sets one.
   */
  requirement?: "minimum" | "target" | "supplementation";
  /** Optimiser constraint that enforces it (feed-optimizer buildConstraintSpecs, ME basis for energy). */
  constraintId?: string;
  guide?: NutrientGuide;
};

const aminoAcid = (id: string, name: string, shortName: string, constraintId: string, guide?: NutrientGuide): FeedNutrient => ({
  id,
  name,
  shortName,
  group: "Amino acids",
  units: ["%", "% of SID Lys"],
  description: `${name} concentration on a standardized ileal digestible basis.`,
  formulationRole: "Direct dietary concentration with an ideal-protein ratio to SID lysine.",
  requirement: "minimum",
  constraintId,
  ...(guide ? { guide } : {}),
});

export const FEED_NUTRIENTS: readonly FeedNutrient[] = [
  {
    id: "metabolizable-energy",
    name: "Metabolizable energy",
    shortName: "ME",
    group: "Energy & protein",
    units: ["kcal/kg"],
    description: "Digestible energy less urinary and gaseous energy losses.",
    formulationRole: "Dietary energy concentration published for each Brazilian Tables phase.",
    requirement: "target",
    constraintId: "energy-me",
    guide: {
      noun: "energy",
      summary: "Energy left for the animal after losses in dung and urine. Anchors the whole recipe.",
      measured: "Kilocalories per kg of feed, as fed. Pig and poultry values differ for the same ingredient, so FeedSport stores both and uses the one that matches the programme.",
      role: "Sets how much feed an animal eats. Most other targets are written relative to energy, so it anchors the whole recipe.",
      tooLow: "Animals eat more to compensate, growth slows and feed conversion worsens.",
      tooHigh: "Intake drops, which can leave amino acids short. Finishing pigs lay down more fat.",
    },
  },
  {
    id: "net-energy",
    name: "Net energy",
    shortName: "NE",
    group: "Energy & protein",
    units: ["kcal/kg"],
    description: "Metabolizable energy less the heat increment of feeding.",
    formulationRole: "Alternative energy expression published alongside metabolizable energy.",
    requirement: "target",
    constraintId: "energy-ne",
  },
  {
    id: "crude-protein",
    name: "Crude protein",
    shortName: "CP",
    group: "Energy & protein",
    units: ["%"],
    description: "Conventional estimate of total dietary protein from nitrogen content.",
    formulationRole: "Published dietary concentration used with the amino-acid requirements.",
    requirement: "minimum",
    constraintId: "crude-protein",
    guide: {
      noun: "protein",
      summary: "Total nitrogen × 6.25. A floor on protein; amino acids usually decide the level.",
      measured: "Nitrogen × 6.25, % as fed.",
      role: "A broad check on total protein. Amino acid targets usually decide the protein level; crude protein sets the floor.",
      tooLow: "Growth slows when non-essential amino acids run short.",
      tooHigh: "Costs more, raises nitrogen in manure, and can cause scouring in weaners and wet litter in broilers.",
    },
  },
  {
    id: "digestible-protein",
    name: "Digestible protein",
    shortName: "Dig. protein",
    group: "Energy & protein",
    units: ["%"],
    description: "Dietary crude protein expressed on the Brazilian Tables swine standardized ileal digestible basis.",
    formulationRole: "Published digestible-protein requirement constrained against swine SID crude-protein values from the ingredient tables.",
    requirement: "minimum",
    constraintId: "digestible-protein",
    guide: {
      noun: "digestible protein",
      summary: "The part of crude protein the animal digests. Set alongside crude protein.",
      measured: "SID crude protein, % as fed.",
      role: "A tighter check than crude protein: it counts only protein absorbed by the end of the small intestine, so poorly digested sources score lower.",
      tooLow: "Growth slows when digestible amino acids run short, even if crude protein looks adequate.",
      tooHigh: "Wasted cost and more nitrogen in manure. Undigested protein fermenting in the hindgut can cause scouring in young pigs.",
    },
  },
  {
    id: "sid-lysine",
    name: "SID lysine",
    shortName: "SID Lys",
    group: "Amino acids",
    units: ["%", "% of SID Lys"],
    description: "Standardized ileal digestible lysine.",
    formulationRole: "Reference amino acid for the Brazilian Tables ideal-protein ratios.",
    requirement: "minimum",
    constraintId: "sid-lysine",
    guide: {
      noun: "lysine",
      summary: "First limiting amino acid in pig diets. Other amino acids are set as ratios to it.",
      measured: "Standardised ileal digestible (SID) lysine, % as fed.",
      role: "First limiting amino acid in maize–soy pig diets and second in poultry. Other amino acid targets are written as ratios to lysine.",
      tooLow: "Lean growth and feed efficiency fall roughly in step with the shortfall.",
      tooHigh: "Little benefit above requirement, and it is one of the costlier nutrients to supply.",
    },
  },
  aminoAcid("sid-methionine-cysteine", "SID methionine + cysteine", "SID Met+Cys", "sid-met-cys", {
    noun: "Met+Cys",
    summary: "First limiting in maize–soy poultry diets. Usually topped up with DL-methionine.",
    measured: "SID methionine plus cysteine, % as fed.",
    role: "First limiting in maize–soy poultry diets. Needed for feathering and lean growth. Usually topped up with DL-methionine.",
    tooLow: "Poor feathering, slower growth and weaker feed conversion, especially in broilers.",
    tooHigh: "Large excesses of methionine reduce feed intake.",
  }),
  aminoAcid("sid-threonine", "SID threonine", "SID Thr", "sid-threonine", {
    noun: "threonine",
    summary: "Third limiting in pigs. Much of it is used to build the gut lining.",
    measured: "SID threonine, % as fed.",
    role: "Third limiting in pigs. A large share goes into gut mucus, so needs rise when gut health is challenged.",
    tooLow: "Growth and feed efficiency fall; young animals show it first.",
    tooHigh: "Mainly an added cost.",
  }),
  aminoAcid("sid-tryptophan", "SID tryptophan", "SID Trp", "sid-tryptophan", {
    noun: "tryptophan",
    summary: "Often fourth limiting in pigs. Maize is low in it, so maize-heavy diets need watching.",
    measured: "SID tryptophan, % as fed.",
    role: "Builds protein and is the precursor of serotonin, which helps regulate appetite. Maize is low in tryptophan, so it often becomes limiting once lysine, threonine and methionine are supplemented.",
    tooLow: "Feed intake and growth fall, and pigs can become more aggressive.",
    tooHigh: "Mainly an added cost.",
  }),
  aminoAcid("sid-valine", "SID valine", "SID Val", "sid-valine", {
    noun: "valine",
    summary: "Becomes limiting when protein is cut and other amino acids come from synthetics.",
    measured: "SID valine, % as fed.",
    role: "A branched-chain amino acid used to build lean tissue. It becomes limiting in low-protein diets once lysine, threonine, methionine and tryptophan are supplied as synthetics.",
    tooLow: "Lower intake and slower growth, especially in low-protein diets.",
    tooHigh: "Mainly an added cost. A large excess of one branched-chain amino acid can unbalance the others.",
  }),
  aminoAcid("sid-isoleucine", "SID isoleucine", "SID Ile", "sid-isoleucine", {
    noun: "isoleucine",
    summary: "Branched-chain amino acid. Can run short in diets that rely on blood products.",
    measured: "SID isoleucine, % as fed.",
    role: "Used to build lean tissue. Blood cells are very low in isoleucine and high in leucine, so diets that use them can run short.",
    tooLow: "Growth and feed efficiency fall.",
    tooHigh: "Mainly an added cost.",
  }),
  aminoAcid("sid-leucine", "SID leucine", "SID Leu", "sid-leucine", {
    noun: "leucine",
    summary: "Branched-chain amino acid, plentiful in maize. Excess matters more than shortage.",
    measured: "SID leucine, % as fed.",
    role: "Used to build lean tissue and signals muscle protein synthesis. Maize and maize by-products supply plenty, so it is rarely limiting.",
    tooLow: "Rare in practical diets; growth would slow.",
    tooHigh: "Large excesses speed the breakdown of valine and isoleucine, which can leave them short and reduce intake.",
  }),
  aminoAcid("sid-histidine", "SID histidine", "SID His", "sid-histidine", {
    noun: "histidine",
    summary: "Rarely limiting in practical diets; part of the ideal protein profile.",
    measured: "SID histidine, % as fed.",
    role: "Used to build lean tissue and muscle buffers such as carnosine. Most practical ingredients supply enough.",
    tooLow: "Slower growth in very low-protein diets.",
    tooHigh: "Mainly an added cost.",
  }),
  aminoAcid("sid-phenylalanine-tyrosine", "SID phenylalanine + tyrosine", "SID Phe+Tyr", "sid-phe-tyr", {
    noun: "Phe+Tyr",
    summary: "Aromatic amino acids, counted together because animals make tyrosine from phenylalanine.",
    measured: "SID phenylalanine plus tyrosine, % as fed.",
    role: "Used to build lean tissue and to make hormones and pigments. Rarely limiting in practical diets.",
    tooLow: "Slower growth in very low-protein diets.",
    tooHigh: "Mainly an added cost.",
  }),
  {
    id: "calcium",
    name: "Calcium",
    shortName: "Ca",
    group: "Macro minerals",
    units: ["%"],
    description: "Dietary calcium concentration.",
    formulationRole: "Published phase requirement for bone mineralization and performance.",
    requirement: "minimum",
    constraintId: "calcium",
    guide: {
      noun: "calcium",
      summary: "Bone mineral. Too much ties up phosphorus and trace minerals.",
      measured: "Total calcium, % as fed.",
      role: "Builds bone and works with phosphorus in bone and energy metabolism.",
      tooLow: "Weak bones and leg problems.",
      tooHigh: "Ties up phosphorus, zinc and other minerals and can reduce intake.",
    },
  },
  {
    id: "total-phosphorus",
    name: "Total phosphorus",
    shortName: "P",
    group: "Macro minerals",
    units: ["%"],
    description: "Total phosphorus present in an ingredient or diet before digestibility adjustment.",
    formulationRole: "Ingredient-analysis value; Chapter 5 requirements use digestible and available phosphorus.",
  },
  {
    id: "sttd-phosphorus",
    name: "Standardized digestible phosphorus",
    shortName: "Dig. P",
    group: "Macro minerals",
    units: ["%"],
    description: "Standardized digestible phosphorus concentration.",
    formulationRole: "Primary digestible-phosphorus requirement published in the Brazilian Tables.",
    requirement: "minimum",
    constraintId: "sttd-phosphorus",
    guide: {
      noun: "digestible phosphorus",
      summary: "Phosphorus digested and absorbed, measured for each ingredient. Used by current pig and broiler tables.",
      measured: "Standardised total tract digestible (STTD) phosphorus, % as fed. Broiler tables call it digestible phosphorus.",
      role: "A more precise measure than available phosphorus: digestibility is measured for each ingredient rather than estimated from phytate. Needed for bone and energy metabolism.",
      tooLow: "Poor bone strength, lameness and slower growth.",
      tooHigh: "Costly, and the excess ends up in soil and water.",
    },
  },
  {
    id: "available-phosphorus",
    name: "Available phosphorus",
    shortName: "Avail. P",
    group: "Macro minerals",
    units: ["%"],
    description: "Estimate of phosphorus biologically available to the pig.",
    formulationRole: "Published alongside standardized digestible phosphorus.",
    requirement: "minimum",
    constraintId: "available-phosphorus",
    guide: {
      noun: "available phosphorus",
      summary: "The phosphorus animals can use. Most grain phosphorus is locked up as phytate.",
      measured: "Available (non-phytate) phosphorus, % as fed.",
      role: "Needed for bone and energy metabolism. Most phosphorus in grains is bound as phytate and largely unavailable without phytase.",
      tooLow: "Poor bone strength, lameness and slower growth.",
      tooHigh: "Costly, and the excess ends up in soil and water.",
    },
  },
  {
    id: "potassium",
    name: "Potassium",
    shortName: "K",
    group: "Macro minerals",
    units: ["%"],
    description: "Dietary potassium concentration.",
    formulationRole: "Published electrolyte requirement for each growing-pig phase.",
    requirement: "minimum",
    constraintId: "potassium",
    guide: {
      noun: "potassium",
      summary: "Electrolyte for fluid and acid–base balance. Soybean meal supplies plenty.",
      measured: "Total potassium, % as fed.",
      role: "Works with sodium and chloride to keep fluid and acid–base balance and nerve and muscle function. Diets with soybean meal rarely run short.",
      tooLow: "Poor appetite and slower growth; rare in practice.",
      tooHigh: "Animals drink more, and manure and litter get wetter.",
    },
  },
  {
    id: "sodium",
    name: "Sodium",
    shortName: "Na",
    group: "Macro minerals",
    units: ["%"],
    description: "Dietary sodium concentration.",
    formulationRole: "Published electrolyte requirement commonly supplied with salt and ingredient sodium.",
    requirement: "minimum",
    constraintId: "sodium",
    guide: {
      noun: "sodium",
      summary: "Controls fluid balance and appetite. Supplied mostly by salt.",
      measured: "Total sodium, % as fed.",
      role: "Controls fluid balance and nerve function and drives appetite. Supplied mostly by salt.",
      tooLow: "Lower intake and growth; more pecking and tail-biting.",
      tooHigh: "Animals drink more, and litter and manure get wetter.",
    },
  },
  {
    id: "chloride",
    name: "Chlorine",
    shortName: "Cl",
    group: "Macro minerals",
    units: ["%"],
    description: "Dietary chlorine concentration.",
    formulationRole: "Published electrolyte requirement in the Brazilian Tables.",
    requirement: "minimum",
    constraintId: "chloride",
    guide: {
      noun: "chlorine",
      summary: "Electrolyte paired with sodium. Supplied mostly by salt.",
      measured: "Total chlorine, % as fed.",
      role: "Works with sodium and potassium in fluid and acid–base balance, and is needed to make stomach acid.",
      tooLow: "Lower intake and growth.",
      tooHigh: "Upsets acid–base balance and can worsen leg problems in broilers.",
    },
  },
  {
    id: "crude-fibre",
    name: "Crude fibre",
    shortName: "CF",
    group: "Fibre",
    units: ["%"],
    description: "Crude fibre concentration.",
    formulationRole: "Tracked for reference; no FeedSport programme sets a crude-fibre requirement.",
    guide: {
      noun: "fibre",
      summary: "Tracked, not required. High fibre dilutes energy in young animals.",
      measured: "Crude fibre, % as fed.",
      role: "Not a requirement. Tracked so fibrous ingredients don’t dilute energy. Sows tolerate and benefit from more fibre than weaners or broilers.",
      tooLow: "No direct problem for pigs or poultry at typical levels.",
      tooHigh: "Lower energy density and digestibility, and slower growth in young animals.",
    },
  },
  {
    id: "linoleic-acid",
    name: "Linoleic acid",
    shortName: "C18:2",
    group: "Fatty acids",
    units: ["%"],
    description: "Dietary linoleic-acid concentration.",
    formulationRole: "Published phase requirement in the Brazilian growing-swine tables.",
    requirement: "minimum",
    constraintId: "linoleic-acid",
    guide: {
      noun: "linoleic acid",
      summary: "Essential fatty acid the animal can't make. Maize and vegetable oils supply it.",
      measured: "Linoleic acid (C18:2), % as fed.",
      role: "An essential omega-6 fatty acid needed for cell membranes and skin. Diets with maize or vegetable oil usually meet the requirement.",
      tooLow: "Poor skin condition and slower growth; rare when maize or vegetable oil is used.",
      tooHigh: "Softer, oilier carcass fat in pigs.",
    },
  },
  {
    id: "zinc",
    name: "Zinc",
    shortName: "Zn",
    group: "Trace minerals",
    units: ["ppm"],
    description: "Zinc trace-mineral concentration.",
    formulationRole: "Chapter 7 suggests a supplementation level; it is checked as an advisory and never constrains the optimiser.",
    requirement: "supplementation",
    guide: {
      noun: "zinc",
      summary: "Needed for skin, hooves and immunity. Supplied mostly through the premix.",
      measured: "Total zinc, ppm (mg/kg) as fed.",
      role: "Part of many enzymes and needed for skin, hoof and feather health, immunity and growth. Phytate in grains and oilseed meals binds much of the zinc they contain.",
      tooLow: "Skin lesions (parakeratosis in pigs), poor feathering and slower growth.",
      tooHigh: "Ties up copper and iron, and ends up in manure; most countries cap it.",
    },
  },
  {
    id: "iron",
    name: "Iron",
    shortName: "Fe",
    group: "Trace minerals",
    units: ["ppm"],
    description: "Iron trace-mineral concentration.",
    formulationRole: "Chapter 7 suggests a supplementation level; it is checked as an advisory and never constrains the optimiser.",
    requirement: "supplementation",
    guide: {
      noun: "iron",
      summary: "Carries oxygen in the blood. Piglets are born with little.",
      measured: "Total iron, ppm (mg/kg) as fed.",
      role: "Part of haemoglobin and many enzymes. Most ingredients supply some, but availability varies; suckling piglets usually get an iron injection.",
      tooLow: "Anaemia, pale skin and slow growth, especially in young piglets.",
      tooHigh: "Can reduce uptake of other minerals; feed ingredients rarely supply an excess.",
    },
  },
  {
    id: "manganese",
    name: "Manganese",
    shortName: "Mn",
    group: "Trace minerals",
    units: ["ppm"],
    description: "Manganese trace-mineral concentration.",
    formulationRole: "Chapter 7 suggests a supplementation level; it is checked as an advisory and never constrains the optimiser.",
    requirement: "supplementation",
    guide: {
      noun: "manganese",
      summary: "Needed for bone and cartilage. Poultry need far more than pigs.",
      measured: "Total manganese, ppm (mg/kg) as fed.",
      role: "Needed for cartilage and bone formation, reproduction and enzyme function. Maize is low in manganese, so poultry diets rely on supplementation.",
      tooLow: "Leg problems in broilers (perosis) and poorer reproduction.",
      tooHigh: "Rare in practice; very high levels can slow growth.",
    },
  },
  {
    id: "copper",
    name: "Copper",
    shortName: "Cu",
    group: "Trace minerals",
    units: ["ppm"],
    description: "Copper trace-mineral concentration.",
    formulationRole: "Chapter 7 suggests a supplementation level; it is checked as an advisory and never constrains the optimiser.",
    requirement: "supplementation",
    guide: {
      noun: "copper",
      summary: "Needed for blood and connective tissue. Kept within legal maximums.",
      measured: "Total copper, ppm (mg/kg) as fed.",
      role: "Needed to use iron, form blood and connective tissue, and pigment hair and feathers.",
      tooLow: "Anaemia, weak bones and blood vessels, and poor hair or feather colour.",
      tooHigh: "Builds up in the liver and ends up in manure; most countries set a legal maximum.",
    },
  },
  {
    id: "iodine",
    name: "Iodine",
    shortName: "I",
    group: "Trace minerals",
    units: ["ppm"],
    description: "Iodine trace-mineral concentration.",
    formulationRole: "Chapter 7 suggests a supplementation level; it is checked as an advisory and never constrains the optimiser.",
    requirement: "supplementation",
  },
  {
    id: "selenium",
    name: "Selenium",
    shortName: "Se",
    group: "Trace minerals",
    units: ["ppm"],
    description: "Selenium trace-mineral concentration.",
    formulationRole: "Chapter 7 suggests a supplementation level; it is checked as an advisory and never constrains the optimiser.",
    requirement: "supplementation",
    guide: {
      noun: "selenium",
      summary: "Antioxidant partner of vitamin E, with a narrow gap between need and excess.",
      measured: "Total selenium, ppm (mg/kg) as fed.",
      role: "Works with vitamin E to protect cells from oxidative damage and supports immunity and fertility. Soil levels drive how much grains contain.",
      tooLow: "Muscle damage (white muscle disease) and poorer fertility.",
      tooHigh: "Toxic not far above requirement; legal maximums apply.",
    },
  },
  ...[
    ["vitamin-a", "Vitamin A", "Vit A", "IU/kg"],
    ["vitamin-d", "Vitamin D", "Vit D", "IU/kg"],
    ["vitamin-e", "Vitamin E", "Vit E", "IU/kg"],
    ["vitamin-k", "Vitamin K", "Vit K", "mg/kg"],
    ["vitamin-b1", "Vitamin B1", "B1", "mg/kg"],
    ["riboflavin", "Riboflavin", "B2", "mg/kg"],
    ["vitamin-b6", "Vitamin B6", "B6", "mg/kg"],
    ["vitamin-b12", "Vitamin B12", "B12", "mcg/kg"],
    ["pantothenic-acid", "Pantothenic acid", "B5", "mg/kg"],
    ["niacin", "Niacin", "Niacin", "mg/kg"],
    ["folic-acid", "Folic acid", "B9", "mg/kg"],
    ["biotin", "Biotin", "Biotin", "mg/kg"],
    ["choline", "Total choline", "Choline", "mg/kg"],
  ].map(([id, name, shortName, unit]) => ({
    id,
    name,
    shortName,
    group: "Vitamins" as const,
    units: [unit],
    description: `${name} dietary concentration.`,
    formulationRole:
      "Ingredient composition can be tracked here; supplementation guidance is not treated as a Chapter 5 animal requirement.",
  })),
];

export function feedNutrientById(id: string): FeedNutrient | undefined {
  return FEED_NUTRIENTS.find((nutrient) => nutrient.id === id);
}
