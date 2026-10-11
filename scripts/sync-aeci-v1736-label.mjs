/**
 * Synchronize the AECI V1736 label transcription in ingredient-library.json.
 *
 * Single source of truth:
 *   src/data/nutrition/premixes/aeci-v1736-pig-weaner-label.csv
 *
 * Run: node scripts/sync-aeci-v1736-label.mjs
 * CI:  node scripts/sync-aeci-v1736-label.mjs --check
 *
 * CSV values/units/notes are kept as strings, not interpreted as nutrients.
 * The CSV does not establish the measurement basis for either number column.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const csvPath = "src/data/nutrition/premixes/aeci-v1736-pig-weaner-label.csv";
const jsonPath = "src/data/nutrition/ingredients/ingredient-library.json";
const csv = readFileSync(resolve(root, csvPath), "utf8");
const lib = JSON.parse(readFileSync(resolve(root, jsonPath), "utf8"));

const EXPECTED_HEADER = [
  "category", "nutrient", "source_form", "left_value",
  "right_value", "right_unit", "note",
];

function parseCsvRow(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (ch === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (quoted) throw new Error("Unterminated quoted field in AECI label CSV");
  values.push(current);
  if (values.length !== EXPECTED_HEADER.length) {
    throw new Error("AECI label CSV row has " + values.length + " fields: " + line);
  }
  return Object.fromEntries(EXPECTED_HEADER.map((key, index) => [key, values[index]]));
}

const lines = csv.replace(/^\uFEFF/, "").trimEnd().split(/\r?\n/);
const header = parseCsvRow(lines.shift());
if (EXPECTED_HEADER.some((name) => header[name] !== name)) {
  throw new Error("Unexpected AECI CSV header");
}
const rows = lines.filter((line) => line.length).map(parseCsvRow);
if (rows.length !== 24) throw new Error("Expected 24 AECI V1736 label rows; got " + rows.length);
if (rows.some((row) => !["Vitamin", "Mineral", "Additive"].includes(row.category) || !row.nutrient)) {
  throw new Error("Invalid category or missing nutrient in AECI CSV");
}
const ingredient = lib.ingredients.find((item) => item.id === "aeci-v1736-pig-weaner-premix");
if (!ingredient?.premix?.labelTranscription) {
  throw new Error("AECI V1736 record missing premix.labelTranscription");
}
const transcript = ingredient.premix.labelTranscription;
transcript.csvPath = csvPath;
transcript.source = "User-supplied pig_weaner_premix_label.csv (authoritative transcription); photograph retained as secondary visual evidence";
transcript.rows = rows;
transcript.firstColumnHeading = "not established by CSV or source photo";
transcript.secondColumnHeading = "not established by CSV or source photo";
transcript.basis = "unknown; raw numeric fields and unit labels are not verified per-kg premix concentrations";
transcript.cautions = [
  "The CSV is authoritative for the transcription, not a laboratory analysis or nutrient guarantee.",
  "Neither numeric column has an established measurement basis; do not infer guaranteed as-fed concentrations.",
  "Choline chloride is not the same as elemental or total choline; do not convert without product specification.",
  "The row 'Magnesium (2nd row, likely lysine)' explicitly notes a possible label error; do not map it to digestible lysine.",
  "The phytase activity unit and basis are not established; do not infer FTU/kg from a bare 10000.",
  "Vitamin E activity/form, selenium content and pantothenic acid are not independently verified.",
  "The CSV notes the Vitamin C right-hand value is difficult to read; preserve the note verbatim.",
];
ingredient.provenance.source.title = "AECI V1736 Pig Weaner — user-supplied CSV transcription of bag label, batch 25254-07.2024";
ingredient.provenance.source.note = "Canonical row data: " + csvPath + ". The photograph supports pack identity and 10 kg/t inclusion, but neither numeric column has a verified concentration basis. The public AECI URL is manufacturer context, not the product datasheet.";
ingredient.provenance.notes = [
  "CSV is the single source of truth for all 24 label rows; it does not establish analytical nutrient concentrations.",
  "The code intentionally withholds AECI nutrient guarantees from formulation calculations pending manufacturer clarification.",
];
ingredient.premix.notes = [
  "Label transcribed from the canonical CSV at " + csvPath + ".",
  "10 kg/t usage remains from the photographed pack; the CSV supplies nutrient/additive table rows only.",
  "Neither value column has established units per kg of premix. No AECI nutrient contributions are credited to the optimizer.",
  "The AECI website gives manufacturer context, not the product's technical specification.",
];

const result = JSON.stringify(lib, null, 2) + "\n";
const original = readFileSync(resolve(root, jsonPath), "utf8");
if (process.argv.includes("--check")) {
  if (result !== original) {
    process.stderr.write("AECI V1736 catalogue snapshot is stale. Run node scripts/sync-aeci-v1736-label.mjs\n");
    process.exitCode = 1;
  } else {
    process.stdout.write("AECI V1736 catalogue is in sync with authoritative CSV (" + rows.length + " rows).\n");
  }
} else {
  writeFileSync(resolve(root, jsonPath), result);
  process.stdout.write("Synced " + rows.length + " AECI V1736 label rows from CSV.\n");
}
