export type ProductStatus = 'In stock' | 'Limited' | 'On request';

export type ProductSpec = {
  label: string;
  value: string;
  unit: string;
};

export type NutrientGroup = {
  title: string;
  rows: ProductSpec[];
};

export type ProductNutritionSource = {
  ingredientId: string;
  ingredientName: string;
  sourceTable: string;
  sourcePage?: number;
  basis: string;
  edition: number;
  year: number;
  title: string;
  publisher: string;
  url: string;
};

export type FeedProduct = {
  id: string;
  name: string;
  grade: string;
  category: string;
  categorySlug: string;
  status: ProductStatus;
  moq: string;
  packaging: string;
  imageLabel: string;
  animals: string[];
  specs: ProductSpec[];
  description: string;
  origin: string;
  certifications: string;
  nutrientGroups?: NutrientGroup[];
  nutritionSource?: ProductNutritionSource;
};

export type FeedProductCatalogItem = Omit<FeedProduct, 'grade' | 'specs' | 'nutrientGroups' | 'nutritionSource'> & {
  nutritionIngredientId?: string;
  gradeFallback: string;
};

/**
 * Commercial catalogue fields only. Nutritional values are deliberately absent
 * here and are joined from the Brazilian Tables JSON library on the server.
 */
export const feedProductCatalog: FeedProductCatalogItem[] = [
  { id: 'soybean-meal', nutritionIngredientId: 'soybean-meal-solvent-extracted', name: 'Soybean meal', gradeFallback: 'Solvent extracted', category: 'Protein feeds', categorySlug: 'protein-feeds', status: 'In stock', moq: '1 tonne', packaging: '50 kg bags or bulk', imageLabel: 'soybean meal — macro, top-down', animals: ['pigs', 'poultry', 'cattle'], description: 'Solvent-extracted soybean meal, a concentrated protein source for pig and poultry diets.', origin: 'Regional suppliers', certifications: 'Batch specification supplied' },
  { id: 'sorghum', nutritionIngredientId: 'sorghum-grain', name: 'Sorghum', gradeFallback: 'Whole or hammer-milled', category: 'Energy feeds', categorySlug: 'energy-feeds', status: 'In stock', moq: '5 tonnes', packaging: '50 kg bags or bulk', imageLabel: 'sorghum — grain kernels', animals: ['pigs', 'poultry', 'cattle'], description: 'A versatile energy grain for pig, poultry and cattle diets. Supplied whole or milled.', origin: 'Zimbabwe', certifications: 'Batch specification supplied' },
  { id: 'wheat-bran', nutritionIngredientId: 'wheat-bran', name: 'Wheat bran', gradeFallback: 'Coarse', category: 'Fibre products', categorySlug: 'fiber-products', status: 'Limited', moq: '1 tonne', packaging: '40 kg bags', imageLabel: 'wheat bran — flakes', animals: ['pigs', 'cattle', 'other'], description: 'Milling by-product with moderate protein and high fibre. Common in sow, ruminant and layer rations.', origin: 'Zimbabwe', certifications: 'Batch specification supplied' },
  { id: 'sunflower-meal', nutritionIngredientId: 'sunflower-meal-solvent-extracted', name: 'Sunflower meal', gradeFallback: 'Solvent extracted', category: 'Protein feeds', categorySlug: 'protein-feeds', status: 'In stock', moq: '1 tonne', packaging: '50 kg bags', imageLabel: 'sunflower meal — texture', animals: ['cattle', 'pigs', 'other'], description: 'Locally available protein, well suited to cattle diets and partial soybean replacement.', origin: 'Zimbabwe', certifications: 'Batch specification supplied' },
  { id: 'fish-meal', nutritionIngredientId: 'fish-meal-54', name: 'Fish meal', gradeFallback: 'Feed grade', category: 'Protein feeds', categorySlug: 'protein-feeds', status: 'On request', moq: '500 kg', packaging: '50 kg bags', imageLabel: 'fish meal — close-up', animals: ['pigs', 'poultry'], description: 'Animal protein with a strong amino acid profile, used in piglet and starter diets.', origin: 'Selected suppliers', certifications: 'Supplier dependent' },
  { id: 'lysine', nutritionIngredientId: 'l-lysine-hcl', name: 'L-Lysine HCl', gradeFallback: 'Crystalline amino acid', category: 'Amino acids', categorySlug: 'amino-acids', status: 'In stock', moq: '25 kg', packaging: '25 kg bags', imageLabel: 'lysine — white granules', animals: ['pigs', 'poultry'], description: 'Crystalline lysine used to meet amino acid targets while reducing reliance on intact protein sources.', origin: 'Selected suppliers', certifications: 'Feed grade certificate' },
  { id: 'methionine', nutritionIngredientId: 'dl-methionine', name: 'Methionine', gradeFallback: 'Crystalline amino acid', category: 'Amino acids', categorySlug: 'amino-acids', status: 'In stock', moq: '25 kg', packaging: '25 kg bags', imageLabel: 'methionine — powder', animals: ['poultry', 'pigs'], description: 'Crystalline methionine source for balancing amino acid supply in pig and poultry diets.', origin: 'Selected suppliers', certifications: 'Feed grade certificate' },
  { id: 'dcp', nutritionIngredientId: 'dicalcium-phosphate', name: 'Dicalcium phosphate', gradeFallback: 'Feed mineral', category: 'Minerals', categorySlug: 'minerals', status: 'In stock', moq: '1 tonne', packaging: '50 kg bags', imageLabel: 'DCP — granular', animals: ['pigs', 'poultry', 'cattle'], description: 'Phosphorus and calcium source for bone growth and egg shell quality.', origin: 'Regional suppliers', certifications: 'Batch specification supplied' },
  { id: 'limestone', nutritionIngredientId: 'limestone-ground', name: 'Feed limestone', gradeFallback: 'Fine and coarse', category: 'Minerals', categorySlug: 'minerals', status: 'In stock', moq: '1 tonne', packaging: '50 kg bags', imageLabel: 'limestone — grit', animals: ['poultry', 'cattle', 'pigs'], description: 'Calcium source supplied in fine and coarse grades, including for laying-hen diets.', origin: 'Zimbabwe', certifications: 'Batch specification supplied' },
  { id: 'premix', name: 'Vitamin & mineral premix', gradeFallback: 'Per species and stage', category: 'Premixes & additives', categorySlug: 'premixes-additives', status: 'On request', moq: '25 kg', packaging: '25 kg bags', imageLabel: 'premix — bag', animals: ['pigs', 'poultry', 'cattle'], description: 'A supplier-specific vitamin and trace-mineral premix selected for the species and production stage.', origin: 'Selected manufacturers', certifications: 'Supplier dependent' },
];

export const productCategories = [
  { id: 'protein-feeds', name: 'Protein feeds', slug: 'protein-feeds', imageLabel: 'soybean / fish meal' },
  { id: 'energy-feeds', name: 'Energy feeds', slug: 'energy-feeds', imageLabel: 'sorghum' },
  { id: 'fiber-products', name: 'Fibre products', slug: 'fiber-products', imageLabel: 'wheat bran' },
  { id: 'minerals', name: 'Minerals', slug: 'minerals', imageLabel: 'DCP / limestone' },
  { id: 'amino-acids', name: 'Amino acids', slug: 'amino-acids', imageLabel: 'lysine granules' },
  { id: 'premixes-additives', name: 'Premixes & additives', slug: 'premixes-additives', imageLabel: 'premix bags' },
];

export const animalNames: Record<string, string> = { pigs: 'Pigs', poultry: 'Poultry', cattle: 'Cattle', other: 'Other livestock' };

export function resolveFeedProductId(id: string) {
  const aliases: Record<string, string> = { maize: 'sorghum', 'yellow-maize': 'sorghum', 'l-lysine': 'lysine' };
  return aliases[id] || id;
}

export function getProductGroups(product: FeedProduct): NutrientGroup[] {
  return product.nutrientGroups || [{ title: 'Key specification', rows: product.specs }];
}
