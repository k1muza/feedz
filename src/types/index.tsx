

import { z } from "zod";

export type TechnicalSpecs = {
  [key: string]: string;
};

export type FeedIngredient = {
  id: string;
  category: string;
  name: string;
  description: string;
  technicalSpecs: TechnicalSpecs;
  applications: string[];
  packaging: string;
  price: number;
  moq: number;
  stock: number;
  certifications: string[];
  images: string[]; // Optional detailed images
  benefits?: string[]; // Optional benefits
  shipping?: string; // Optional shipping info
  featured?: boolean;
};

export type Author = {
  name: string;
  role: string;
  image: string;
  bio?: string;
};

export type User = {
    id: string;
    name: string;
    email: string;
    role: 'Administrator' | 'Editor' | 'Viewer';
    image: string;
    bio: string;
    lastActive: string;
};


export type BlogCategory = {
  id: string;
  name: string;
  slug: string;
};

export type ProductCategory = {
  id: string;
  name: string;
  slug: string;
};

export const BlogPostSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string(),
  content: z.string(),
  image: z.string().url(),
  category: z.string(),
  tags: z.array(z.string()),
  featured: z.boolean(),
  date: z.string(), // or z.date() if you parse it
  author: z.object({
    name: z.string(),
    role: z.string(),
    image: z.string().url(),
  }),
  readingTime: z.string(),
});

export type BlogPost = z.infer<typeof BlogPostSchema>;


export interface Nutrient {
  id: string;
  name: string;
  description?: string;
  unit: string;
  category?: string | null;
}

export interface TargetNutrient extends Nutrient {
  target: number;
  max?: number;
  actual?: number;
  over?: number;
  under?: number;
  underPenaltyFactor?: number;
  overPenaltyFactor?: number;
}

export type Composition = {
    value: number;
    nutrientId: string;
    basis?: string;
    table?: string;
    nutrient?: Nutrient;
};

export type Ingredient = {
    id: string;
    name: string;
    description: string;
    key_benefits?: string[];
    applications?: string[];
    category?: string;
    compositions: Composition[];
};

export type Product = {
  id: string;
  ingredientId: string;
  ingredient?: Ingredient;
  packaging: string;
  price: number;
  moq: number;
  stock: number;
  certifications: string[];
  images: string[];
  shipping?: string;
  featured?: boolean;
};

export type ContactInquiry = {
  id: string;
  name: string;
  email: string;
  message: string;
  phone?: string;
  submittedAt: { seconds: number; nanoseconds: number };
  read: boolean;
}

export type NewsletterSubscription = {
  id: string;
  email: string;
  subscribedAt: { seconds: number; nanoseconds: number };
}

export type AppSettings = {
    registrationsOpen: boolean;
    aiChatEnabled: boolean;
    chatWidgetEnabled: boolean;
};


export type Policy = {
    id: string;
    title: string;
    content: string;
    lastUpdated: string;
}

export type InvoiceItem = {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
};

export type Invoice = {
    id: string;
    invoiceNumber: string;
    customerId: string; // Or a more complex customer object
    customerName: string;
    customerEmail: string;
    issueDate: { seconds: number, nanoseconds: number };
    dueDate: { seconds: number, nanoseconds: number };
    items: InvoiceItem[];
    totalAmount: number;
    status: 'draft' | 'sent' | 'paid' | 'void';
};


// Types
export interface RatioIngredient extends Ingredient {
  ratio: number;
  costPerKg?: number;
  min?: number; // Add min constraint
  max?: number; // Add max constraint
}

export interface IngredientSuggestion {
  ingredient?: Ingredient;
  nutrient?: Nutrient;
  target?: number;
  current?: number;
}


export interface Program {
  id: number;
  market_segment: string;
  stages: Stage[];
}

// One phase within a program (Starter, Grower, Finisher, etc.)
export interface Stage {
  id: number;
  stage: string;
  slug: string;
  period_days: PeriodDays;
  feed_structure: string | null;
  feeding_amount_per_bird: ValueUnit | null;
  nutritional_requirements: Record<string, Metric>;
  added_trace_minerals_per_kg: Record<string, ValueUnit>;
  added_vitamins_per_kg: Record<string, ValueUnit>;
  minimum_specifications: Record<string, RangeUnit>;
  water_requirement: WaterRequirement | null;
  key_notes: string;
}

// e.g. { min: 0, max: 10, notes?: "until market" }
export interface PeriodDays {
  min: number;
  max: number | null;
  notes?: string;
}

// Simple value + unit
export interface ValueUnit {
  value: number;
  unit: string;
}

// Range of values + unit
export interface RangeUnit {
  min?: number;
  max?: number | null;
  unit?: string;
}

// Either a ValueUnit or a RangeUnit
export type Metric = ValueUnit | RangeUnit;

// Water specs: may include different flow‐rate arrays or a ratio
export interface WaterRequirement {
  flow_rate_per_minute?: FlowRate[];
  flow_rate_per_30_seconds?: FlowRate[];
  water_to_feed_ratio?: RangeUnit;
}

// e.g. { age_weeks: {min:2,max:4}, min:34, max:48, unit:"ml/min" }
export interface FlowRate {
  age_weeks: { min: number; max: number | null };
  min: number | null;
  max: number | null;
  unit: string;
}

export interface Formulation {
  id: string;
  name: string;
  date: string;
  ingredients: RatioIngredient[];
  targets: TargetNutrient[];
}

// Add to existing types
export interface NutrientSuggestion {
  nutrient: Nutrient;
  target: number;
  current: number;
}

export type NutrientReference = Record<string, { avg: number }>;
export type NutrientRankings = Record<string, number>;

export interface RankedComposition extends Composition {
  diff: number;
  nutrient: Nutrient; // Make nutrient required
}

export interface TopRankedNutrient {
  name: string;
  rank: number;
  value: number;
  unit: string;
  diff: number;
  avg: number;
}
