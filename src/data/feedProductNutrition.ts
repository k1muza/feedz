import {
  INGREDIENT_LIBRARY,
  type IngredientNutrientRecord,
} from '@/lib/ingredient-nutrients';
import { BRAZILIAN_2024_SOURCE } from '@/lib/brazilian-nutrition';
import {
  feedProductCatalog,
  resolveFeedProductId,
  type FeedProduct,
  type FeedProductCatalogItem,
  type NutrientGroup,
  type ProductSpec,
} from '@/data/feedProducts';

type NumericRecord = Record<string, number | undefined>;

const compositionRows = [
  ['dryMatterPct', 'Dry matter'],
  ['crudeProteinPct', 'Crude protein'],
  ['digestibleProteinPct', 'Digestible protein'],
  ['crudeFatPct', 'Crude fat'],
  ['crudeFibrePct', 'Crude fibre'],
  ['ashPct', 'Ash'],
  ['starchPct', 'Starch'],
  ['neutralDetergentFibrePct', 'NDF'],
  ['acidDetergentFibrePct', 'ADF'],
  ['linoleicAcidPct', 'Linoleic acid'],
] as const;

const energyRows = [
  ['digestibleKcalKg', 'Digestible energy'],
  ['metabolizableKcalKg', 'ME swine'],
  ['standardizedMetabolizableKcalKg', 'Standardised ME'],
  ['netKcalKg', 'Net energy'],
] as const;

const aminoAcidRows = [
  ['lysine', 'Lysine'],
  ['methionine', 'Methionine'],
  ['methionineCysteine', 'Met + Cys'],
  ['threonine', 'Threonine'],
  ['tryptophan', 'Tryptophan'],
] as const;

const mineralRows = [
  ['calciumPct', 'Calcium'],
  ['totalPhosphorusPct', 'Total phosphorus'],
  ['availablePhosphorusPct', 'Available phosphorus'],
  ['sttdPhosphorusPct', 'STTD phosphorus'],
  ['sodiumPct', 'Sodium'],
  ['chloridePct', 'Chloride'],
  ['potassiumPct', 'Potassium'],
  ['magnesiumPct', 'Magnesium'],
] as const;

function sourceNumber(value: number, unit: string) {
  if (unit === 'kcal/kg') return value.toLocaleString('en-US');
  return value.toLocaleString('en-US', {
    maximumFractionDigits: Math.abs(value) >= 10 ? 2 : 4,
    useGrouping: false,
  });
}

function rowsFrom(
  values: NumericRecord,
  definitions: readonly (readonly [string, string])[],
  unit: string,
): ProductSpec[] {
  return definitions.flatMap(([key, label]) => {
    const value = values[key];
    return value === undefined ? [] : [{ label, value: sourceNumber(value, unit), unit }];
  });
}

function nutrientGroupsFor(ingredient: IngredientNutrientRecord): NutrientGroup[] {
  const composition = rowsFrom(ingredient.composition, compositionRows, '%');
  const energy = rowsFrom(ingredient.energy, energyRows, 'kcal/kg');
  const totalAminoAcids = rowsFrom(ingredient.aminoAcids.totalPct, aminoAcidRows, '%');
  const sidAminoAcids = rowsFrom(ingredient.aminoAcids.sidPct, aminoAcidRows, '%');
  const minerals = rowsFrom(ingredient.macroMinerals, mineralRows, '%');

  return [
    composition.length ? { title: 'Proximate', rows: composition } : undefined,
    energy.length ? { title: 'Energy', rows: energy } : undefined,
    totalAminoAcids.length ? { title: 'Amino acids', rows: totalAminoAcids } : undefined,
    !totalAminoAcids.length && sidAminoAcids.length ? { title: 'SID amino acids', rows: sidAminoAcids } : undefined,
    minerals.length ? { title: 'Minerals', rows: minerals } : undefined,
  ].filter((group): group is NutrientGroup => Boolean(group));
}

function firstSpec(rows: ProductSpec[], label: string) {
  return rows.find((row) => row.label === label);
}

function keySpecsFor(ingredient: IngredientNutrientRecord, groups: NutrientGroup[]) {
  const rows = groups.flatMap((group) => group.rows);
  const preferredLabels = ingredient.category === 'mineral'
    ? ['Total phosphorus', 'Calcium', 'STTD phosphorus', 'Magnesium']
    : ingredient.category === 'amino_acid'
      ? ['Lysine', 'Methionine', 'Standardised ME', 'Net energy']
      : ['Crude protein', 'ME swine', 'Crude fibre', 'Calcium'];

  return preferredLabels.flatMap((label) => firstSpec(rows, label) ?? []).slice(0, 3);
}

function gradeFor(item: FeedProductCatalogItem, ingredient: IngredientNutrientRecord) {
  if (ingredient.category === 'amino_acid') return `${ingredient.name} · dry-matter basis`;
  if (ingredient.composition.crudeProteinPct !== undefined) {
    return `${sourceNumber(ingredient.composition.crudeProteinPct, '%')}% CP · as fed`;
  }
  if (ingredient.macroMinerals.totalPhosphorusPct !== undefined) {
    return `${sourceNumber(ingredient.macroMinerals.totalPhosphorusPct, '%')}% phosphorus · as fed`;
  }
  if (ingredient.macroMinerals.calciumPct !== undefined) {
    return `${sourceNumber(ingredient.macroMinerals.calciumPct, '%')}% calcium · as fed`;
  }
  return item.gradeFallback;
}

function nutritionSourceFor(ingredient: IngredientNutrientRecord) {
  const source = ingredient.provenance.source;
  if (!source || !ingredient.provenance.sourceTable) return undefined;

  return {
    ingredientId: ingredient.id,
    ingredientName: ingredient.provenance.sourceIngredientName ?? ingredient.name,
    sourceTable: ingredient.provenance.sourceTable,
    sourcePage: ingredient.provenance.sourcePage,
    basis: source.basis ?? INGREDIENT_LIBRARY.basis.nutrientComposition,
    edition: BRAZILIAN_2024_SOURCE.edition,
    year: BRAZILIAN_2024_SOURCE.year,
    title: BRAZILIAN_2024_SOURCE.title,
    publisher: BRAZILIAN_2024_SOURCE.publisher,
    url: source.url,
  };
}

export function enrichProduct(item: FeedProductCatalogItem): FeedProduct {
  const { nutritionIngredientId, gradeFallback, ...catalogue } = item;

  if (!nutritionIngredientId) {
    return {
      ...catalogue,
      grade: gradeFallback,
      specs: [{ label: 'Specification', value: 'Supplier-defined', unit: '' }],
    };
  }

  const ingredient = INGREDIENT_LIBRARY.ingredients.find((record) => record.id === nutritionIngredientId);
  if (!ingredient) {
    throw new Error(`Missing Brazilian Tables ingredient mapping for product ${item.id}: ${nutritionIngredientId}`);
  }

  const nutrientGroups = nutrientGroupsFor(ingredient);
  const specs = keySpecsFor(ingredient, nutrientGroups);
  if (specs.length === 0) {
    throw new Error(`Brazilian Tables ingredient ${ingredient.id} has no displayable product specifications.`);
  }

  return {
    ...catalogue,
    grade: gradeFor(item, ingredient),
    specs,
    nutrientGroups,
    nutritionSource: nutritionSourceFor(ingredient),
  };
}

export const feedProducts: FeedProduct[] = feedProductCatalog.map(enrichProduct);

export function getFeedProduct(id: string) {
  const resolvedId = resolveFeedProductId(id);
  return feedProducts.find((product) => product.id === resolvedId);
}
