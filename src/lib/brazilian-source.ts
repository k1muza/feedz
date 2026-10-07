import { z } from "zod";

import sourceJson from "@/data/nutrition/brazilian-2024/source.json";

import { assertUniqueIds } from "./nutrition-validation";

const anomalyTargetSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("poultry-ingredient-nutrient"),
      ingredientId: z.string(),
      nutrient: z.string(),
      check: z.literal("amino-acid-digestibility"),
    })
    .strict(),
  z
    .object({
      kind: z.literal("broiler-phase"),
      programmeId: z.string(),
      phaseId: z.string(),
      check: z.literal("average-weight-within-band"),
    })
    .strict(),
  z
    .object({
      kind: z.literal("broiler-programme"),
      programmeId: z.string(),
      check: z.literal("published-average-weights"),
    })
    .strict(),
]);

const sourceAnomalySchema = z
  .object({
    id: z.string(),
    table: z.string(),
    printedPage: z.number(),
    target: anomalyTargetSchema,
    description: z.string(),
  })
  .strict();

const sourceSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.literal("brazilian-tables-2024"),
    title: z.string(),
    edition: z.literal(5),
    year: z.literal(2024),
    language: z.string(),
    isbn: z.string(),
    publisher: z.string(),
    editors: z.array(z.string()),
    coverage: z.record(z.string(), z.string()),
    extraction: z
      .object({
        status: z.enum(["in_progress", "complete"]),
        policy: z.array(z.string()),
        completedTables: z.array(z.string()),
        nextTables: z.array(z.string()),
        sourceAnomalies: z.array(sourceAnomalySchema).optional(),
      })
      .strict(),
  })
  .strict();

export const BRAZILIAN_2024_SOURCE = sourceSchema.parse(sourceJson);

const anomalies = BRAZILIAN_2024_SOURCE.extraction.sourceAnomalies ?? [];
assertUniqueIds(anomalies, "Brazilian 2024 source anomalies");

export const BRAZILIAN_2024_SOURCE_ANOMALIES = new Map(
  anomalies.map((anomaly) => [anomaly.id, anomaly]),
);

export function requireSourceAnomaly(id: string) {
  const anomaly = BRAZILIAN_2024_SOURCE_ANOMALIES.get(id);
  if (!anomaly) {
    throw new Error(`Unknown Brazilian 2024 source anomaly "${id}".`);
  }
  return anomaly;
}

export function assertKnownSourceAnomalyIds(
  ids: readonly string[] | undefined,
  label: string,
): void {
  for (const id of ids ?? []) {
    if (!BRAZILIAN_2024_SOURCE_ANOMALIES.has(id)) {
      throw new Error(`Unknown Brazilian 2024 source anomaly "${id}" in ${label}.`);
    }
  }
}
