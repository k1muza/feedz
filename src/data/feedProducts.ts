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
};

const specs = (rows: string[][]): ProductSpec[] => rows.map(([label, value, unit]) => ({ label, value, unit }));
const group = (title: string, rows: string[][]): NutrientGroup => ({ title, rows: specs(rows) });

const soybeanProfile = [
  group('Proximate', [['Dry matter', '88.0', '%'], ['Crude protein', '46.0', '%'], ['Crude fat', '1.5', '%'], ['Crude fibre', '6.0', '%'], ['Ash', '6.5', '%']]),
  group('Energy', [['ME poultry', '2,450', 'kcal/kg'], ['ME pigs', '3,180', 'kcal/kg']]),
  group('Amino acids', [['Lysine', '2.85', '%'], ['Methionine', '0.65', '%'], ['Met + Cys', '1.35', '%'], ['Threonine', '1.80', '%'], ['Tryptophan', '0.62', '%']]),
  group('Minerals', [['Calcium', '0.30', '%'], ['Total phosphorus', '0.65', '%'], ['Available phosphorus', '0.20', '%']]),
];

const sorghumProfile = [
  group('Proximate', [['Dry matter', '88.0', '%'], ['Crude protein', '10.5', '%'], ['Crude fat', '3.2', '%'], ['Crude fibre', '2.8', '%'], ['Ash', '1.7', '%']]),
  group('Energy', [['ME poultry', '3,250', 'kcal/kg'], ['ME pigs', '3,300', 'kcal/kg']]),
  group('Amino acids', [['Lysine', '0.22', '%'], ['Methionine', '0.16', '%'], ['Met + Cys', '0.34', '%'], ['Threonine', '0.32', '%'], ['Tryptophan', '0.10', '%']]),
  group('Minerals', [['Calcium', '0.03', '%'], ['Total phosphorus', '0.29', '%'], ['Available phosphorus', '0.09', '%']]),
];

const wheatBranProfile = [
  group('Proximate', [['Dry matter', '88.0', '%'], ['Crude protein', '15.5', '%'], ['Crude fat', '4.0', '%'], ['Crude fibre', '10.0', '%'], ['Ash', '5.8', '%']]),
  group('Energy', [['ME poultry', '1,300', 'kcal/kg'], ['ME pigs', '2,200', 'kcal/kg']]),
  group('Amino acids', [['Lysine', '0.60', '%'], ['Methionine', '0.23', '%'], ['Met + Cys', '0.55', '%'], ['Threonine', '0.48', '%'], ['Tryptophan', '0.22', '%']]),
  group('Minerals', [['Calcium', '0.10', '%'], ['Total phosphorus', '1.15', '%'], ['Available phosphorus', '0.30', '%']]),
];

export const feedProducts: FeedProduct[] = [
  { id: 'soybean-meal', name: 'Soybean meal', grade: 'Hi-Pro, 46% CP', category: 'Protein feeds', categorySlug: 'protein-feeds', status: 'In stock', moq: '1 tonne', packaging: '50 kg bags or bulk', imageLabel: 'soybean meal — macro, top-down', animals: ['pigs', 'poultry', 'cattle'], specs: specs([['Protein', '46', '%'], ['ME poultry', '2,450', 'kcal/kg'], ['Fibre', '6.0', '%']]), description: 'Solvent-extracted soybean meal, the main protein source in most pig and poultry diets.', origin: 'Regional suppliers', certifications: 'Batch specification supplied', nutrientGroups: soybeanProfile },
  { id: 'sorghum', name: 'Sorghum', grade: 'Whole or hammer-milled', category: 'Energy feeds', categorySlug: 'energy-feeds', status: 'In stock', moq: '5 tonnes', packaging: '50 kg bags or bulk', imageLabel: 'sorghum — grain kernels', animals: ['pigs', 'poultry', 'cattle'], specs: specs([['Protein', '10.5', '%'], ['ME poultry', '3,250', 'kcal/kg'], ['Fat', '3.2', '%']]), description: 'A versatile energy grain for pig, poultry and cattle diets. Supplied whole or milled.', origin: 'Zimbabwe', certifications: 'Batch specification supplied', nutrientGroups: sorghumProfile },
  { id: 'wheat-bran', name: 'Wheat bran', grade: 'Coarse', category: 'Fibre products', categorySlug: 'fiber-products', status: 'Limited', moq: '1 tonne', packaging: '40 kg bags', imageLabel: 'wheat bran — flakes', animals: ['pigs', 'cattle', 'other'], specs: specs([['Protein', '15.5', '%'], ['Fibre', '10.0', '%'], ['ME poultry', '1,300', 'kcal/kg']]), description: 'Milling by-product with moderate protein and high fibre. Common in sow, ruminant and layer rations.', origin: 'Zimbabwe', certifications: 'Batch specification supplied', nutrientGroups: wheatBranProfile },
  { id: 'sunflower-meal', name: 'Sunflower meal', grade: 'Expeller', category: 'Protein feeds', categorySlug: 'protein-feeds', status: 'In stock', moq: '1 tonne', packaging: '50 kg bags', imageLabel: 'sunflower meal — texture', animals: ['cattle', 'pigs', 'other'], specs: specs([['Protein', '34', '%'], ['Fibre', '21', '%'], ['ME poultry', '1,800', 'kcal/kg']]), description: 'Locally available protein, well suited to cattle diets and partial soybean replacement.', origin: 'Zimbabwe', certifications: 'Batch specification supplied' },
  { id: 'fish-meal', name: 'Fish meal', grade: '62% CP', category: 'Protein feeds', categorySlug: 'protein-feeds', status: 'On request', moq: '500 kg', packaging: '50 kg bags', imageLabel: 'fish meal — close-up', animals: ['pigs', 'poultry'], specs: specs([['Protein', '62', '%'], ['Lysine', '4.8', '%'], ['Calcium', '5.0', '%']]), description: 'Animal protein with a strong amino acid profile, used in piglet and starter diets.', origin: 'Selected suppliers', certifications: 'Supplier dependent' },
  { id: 'lysine', name: 'L-Lysine HCl', grade: 'Feed grade, 98.5%', category: 'Amino acids', categorySlug: 'amino-acids', status: 'In stock', moq: '25 kg', packaging: '25 kg bags', imageLabel: 'lysine — white granules', animals: ['pigs', 'poultry'], specs: specs([['Lysine', '78.8', '%'], ['Purity', '98.5', '%']]), description: 'Synthetic lysine to meet amino acid targets with less soybean meal.', origin: 'Selected suppliers', certifications: 'Feed grade certificate' },
  { id: 'methionine', name: 'DL-Methionine', grade: 'Feed grade, 99%', category: 'Amino acids', categorySlug: 'amino-acids', status: 'In stock', moq: '25 kg', packaging: '25 kg bags', imageLabel: 'methionine — powder', animals: ['poultry', 'pigs'], specs: specs([['Methionine', '99', '%']]), description: 'Usually the first-limiting amino acid in poultry diets.', origin: 'Selected suppliers', certifications: 'Feed grade certificate' },
  { id: 'dcp', name: 'Dicalcium phosphate', grade: 'DCP, 18% P', category: 'Minerals', categorySlug: 'minerals', status: 'In stock', moq: '1 tonne', packaging: '50 kg bags', imageLabel: 'DCP — granular', animals: ['pigs', 'poultry', 'cattle'], specs: specs([['Phosphorus', '18', '%'], ['Calcium', '23', '%']]), description: 'Phosphorus and calcium for bone growth and egg shell quality.', origin: 'Regional suppliers', certifications: 'Batch specification supplied' },
  { id: 'limestone', name: 'Feed limestone', grade: 'Fine and coarse', category: 'Minerals', categorySlug: 'minerals', status: 'In stock', moq: '1 tonne', packaging: '50 kg bags', imageLabel: 'limestone — grit', animals: ['poultry', 'cattle', 'pigs'], specs: specs([['Calcium', '38', '%']]), description: 'Calcium carbonate. Coarse grade for laying hens.', origin: 'Zimbabwe', certifications: 'Batch specification supplied' },
  { id: 'premix', name: 'Vitamin & mineral premix', grade: 'Per species and stage', category: 'Premixes & additives', categorySlug: 'premixes-additives', status: 'On request', moq: '25 kg', packaging: '25 kg bags', imageLabel: 'premix — bag', animals: ['pigs', 'poultry', 'cattle'], specs: specs([['Inclusion', '0.25–0.5', '%']]), description: 'Vitamins and trace minerals for complete feeds.', origin: 'Selected manufacturers', certifications: 'Supplier dependent' },
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

export function getFeedProduct(id: string) {
  const aliases: Record<string, string> = { maize: 'sorghum', 'yellow-maize': 'sorghum', 'l-lysine': 'lysine' };
  return feedProducts.find((product) => product.id === (aliases[id] || id));
}

export function getProductGroups(product: FeedProduct): NutrientGroup[] {
  return product.nutrientGroups || [{ title: 'Key specification', rows: product.specs }];
}
