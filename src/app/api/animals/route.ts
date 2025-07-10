'use server';

import { getAnimals } from "@/data/animals";
import { NextResponse } from "next/server";

export async function GET() {
  const animals = getAnimals();
  return NextResponse.json(animals);
}
