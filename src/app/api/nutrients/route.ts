'use server';

import { getNutrients } from "@/data/nutrients";
import { NextResponse } from "next/server";

export async function GET() {
  const nutrients = getNutrients();
  return NextResponse.json(nutrients);
}
