import { Nutrient } from "@/types";

export type FeedingAmount = {
  value: number;
  unit: string;
  notes: string;
}

export type AnimalNutrientRequirement = {
  nutrientId: string;
  value: number;
  min: number;
  max?: number;
  nutrient?: Nutrient;
}

export type AnimalStagePeriod = {
  min: number;
  max: number | null;
  notes?: string | null;
}

export type AnimalProgramStage = {
  id: number;
  stage: string;
  slug: string;
  period_days: AnimalStagePeriod;
  feed_structure: string;
  feeding_amount_per_bird: FeedingAmount | null;
  water_requirement: number | null;
  key_notes: string;
  requirements: AnimalNutrientRequirement[];
};

export type AnimalProgram = {
  id: number;
  market_segment: string;
  stages: AnimalProgramStage[];
};

export type Animal = {
  id: number;
  species: string;
  slug: string;
  breed: string;
  description: string;
  programs: AnimalProgram[];
};
