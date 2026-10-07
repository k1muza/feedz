import { z } from "zod";

import sourceJson from "@/data/nutrition/brazilian-2024/source.json";

const sourceSchema = z.object({
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
  extraction: z.object({
    status: z.enum(["in_progress", "complete"]),
    policy: z.array(z.string()),
    completedTables: z.array(z.string()),
    nextTables: z.array(z.string()),
    sourceAnomalies: z
      .array(
        z.object({
          id: z.string(),
          table: z.string(),
          printedPage: z.number(),
          description: z.string(),
        }).strict(),
      )
      .optional(),
  }).strict(),
}).strict();

export const BRAZILIAN_2024_SOURCE = sourceSchema.parse(sourceJson);

export const BRAZILIAN_2024_SOURCE_ANOMALY_IDS = new Set(
  (BRAZILIAN_2024_SOURCE.extraction.sourceAnomalies ?? []).map((anomaly) => anomaly.id),
);

export function assertKnownSourceAnomalyIds(
  ids: readonly string[] | undefined,
  label: string,
): void {
  for (const id of ids ?? []) {
    if (!BRAZILIAN_2024_SOURCE_ANOMALY_IDS.has(id)) {
      throw new Error(`Unknown Brazilian 2024 source anomaly "${id}" in ${label}.`);
    }
  }
}
