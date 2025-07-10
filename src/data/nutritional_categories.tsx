export interface NutritionalCategory {
  id: string;
  name: string;
  parentId: string | null;
  description: string;
}

export const NUTRITIONAL_CATEGORIES: NutritionalCategory[] = [
  {
    id: 'macronutrients',
    name: 'Macronutrients',
    parentId: null,
    description: 'Primary structural components and energy sources necessary for basic physiological functions.'
  },
  {
    id: 'minerals',
    name: 'Minerals',
    parentId: null,
    description: 'Inorganic compounds needed for various body functions, including enzyme functions, bone formation, and osmoregulation.'
  },
  {
    id: 'energy',
    name: 'Energy',
    parentId: null,
    description: 'Digestible energy available from the feed that can be metabolized by the animal.'
  },
  {
    id: 'vitamins-and-other-nutrients',
    name: 'Vitamins and Other Nutrients',
    parentId: null,
    description: 'Includes vitamins and other compounds essential for metabolic functions and overall health.'
  },
  {
    id: 'proteins-and-amino-acids',
    name: 'Proteins and Amino Acids',
    parentId: 'macronutrients',
    description: 'Includes crude protein and essential amino acids necessary for growth and repair of body tissues.'
  },
  {
    id: 'fats',
    name: 'Fats',
    parentId: 'macronutrients',
    description: 'Major energy source, also affects fat-soluble vitamin absorption and storage.'
  },
  {
    id: 'carbohydrates',
    name: 'Carbohydrates',
    parentId: 'macronutrients',
    description: 'Includes dietary fibers that impact digestion and metabolism of nutrients.'
  },
  {
    id: 'macro-minerals',
    name: 'Macro Minerals',
    parentId: 'minerals',
    description: 'Essential minerals that are needed in larger amounts for overall health.'
  },
  {
    id: 'trace-minerals',
    name: 'Trace Minerals',
    parentId: 'minerals',
    description: 'Minerals that are crucial in smaller amounts for specific physiological functions.'
  },
  {
    id: 'metabolizable-energy',
    name: 'Metabolizable Energy (ME)',
    parentId: 'energy',
    description: 'Energy that can be absorbed and utilized by the animal, excluding energy lost in excretion or fermentation.'
  },
  {
    id: 'choline',
    name: 'Choline',
    parentId: 'vitamins-and-other-nutrients',
    description: 'Vital for liver function and overall metabolism.'
  }
];

