'use server';

import { getIngredients } from "@/data/ingredients";
import { NextResponse } from "next/server";

export async function GET() {
  const ingredients = getIngredients();
  return NextResponse.json(ingredients);
}
