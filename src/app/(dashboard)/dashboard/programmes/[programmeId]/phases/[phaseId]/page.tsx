import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { feedProgrammeById, feedProgrammePhaseById } from "@/lib/feed-programmes";
import { feedProgrammeHref } from "@/lib/formulation-routes";

function value(value: number | undefined, suffix = ""): string {
  return value === undefined ? "—" : `${value}${suffix}`;
}

export default async function FeedProgrammePhasePage({
  params,
}: {
  params: Promise<{ programmeId: string; phaseId: string }>;
}) {
  const { programmeId, phaseId } = await params;
  const programme = feedProgrammeById(programmeId);
  const phase = feedProgrammePhaseById(programmeId, phaseId);
  if (!programme || !phase) notFound();

  const r = phase.requirements;
  const sid = r.sidAminoAcidsPct;
  const ratios = r.aminoAcids;

  const groups = [
    {
      title: "Energy & protein",
      rows: [
        ["Metabolizable energy", value(r.metabolizableEnergyKcalKg, " kcal/kg")],
        ["Net energy", value(r.netEnergyKcalKg, " kcal/kg")],
        ["Crude protein", value(r.crudeProteinPct, "%")],
        ["Digestible protein", value(r.digestibleProteinPct, "%")],
        ...(phase.dailyMetabolizableEnergyKcal !== undefined
          ? [["Daily metabolizable energy", value(phase.dailyMetabolizableEnergyKcal, " kcal/day")]]
          : []),
        ...(phase.dailyFeedIntakeKg !== undefined
          ? [["Reference feed intake", value(phase.dailyFeedIntakeKg, " kg/day")]]
          : []),
      ],
    },
    {
      title: "SID amino acids",
      rows: [
        ["Lysine", value(sid.lysine, "%")],
        ["Methionine + cysteine", value(sid.methionineCysteine, "%")],
        ["Threonine", value(sid.threonine, "%")],
        ["Tryptophan", value(sid.tryptophan, "%")],
        ["Valine", value(sid.valine, "%")],
        ["Isoleucine", value(sid.isoleucine, "%")],
        ["Leucine", value(sid.leucine, "%")],
        ["Histidine", value(sid.histidine, "%")],
        ["Phenylalanine + tyrosine", value(sid.phenylalanineTyrosine, "%")],
      ],
    },
    {
      title: "Amino-acid ratios to SID lysine",
      rows: [
        ["Methionine + cysteine : Lys", value(ratios.methionineCysteineToLysPct, "%")],
        ["Threonine : Lys", value(ratios.threonineToLysPct, "%")],
        ["Tryptophan : Lys", value(ratios.tryptophanToLysPct, "%")],
        ["Valine : Lys", value(ratios.valineToLysPct, "%")],
        ["Isoleucine : Lys", value(ratios.isoleucineToLysPct, "%")],
        ["Leucine : Lys", value(ratios.leucineToLysPct, "%")],
        ["Histidine : Lys", value(ratios.histidineToLysPct, "%")],
        ["Phenylalanine + tyrosine : Lys", value(ratios.phenylalanineTyrosineToLysPct, "%")],
      ],
    },
    {
      title: "Minerals & fatty acid",
      rows: [
        ["Calcium", value(r.minerals.calciumPct, "%")],
        ["Standardized digestible phosphorus", value(r.minerals.sttdPhosphorusPct, "%")],
        ["Available phosphorus", value(r.minerals.availablePhosphorusPct, "%")],
        ["Potassium", value(r.potassiumPct, "%")],
        ["Sodium", value(r.minerals.sodiumPct, "%")],
        ["Chlorine", value(r.minerals.chloridePct, "%")],
        ["Linoleic acid", value(r.linoleicAcidPct, "%")],
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={feedProgrammeHref(programme.id)}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline"
        >
          <ArrowLeft size={14} />
          {programme.name}
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight text-ink">{programme.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="text-base font-medium capitalize text-ink-muted">{phase.label}</div>
          <Badge variant="secondary">{phase.sourceWeightRange}</Badge>
          <Badge variant="secondary">
            {programme.sourceProgramme?.source.includes("PIC") ? "PIC " : "Table "}
            {phase.sourceTable}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-ink-muted">
          {programme.sourceProgramme?.source} · {programme.sourceProgramme?.sourceVersion} ·
          source page {phase.sourcePage}
        </p>
        {phase.periodLabel ? (
          <p className="mt-1 text-xs text-ink-faint">
            Published period: {phase.periodLabel}
          </p>
        ) : phase.ageMinDays !== undefined && phase.ageMaxDays !== undefined ? (
          <p className="mt-1 text-xs text-ink-faint">
            Published age range: {phase.ageMinDays}–{phase.ageMaxDays} days
          </p>
        ) : null}
        {phase.parity ? (
          <p className="mt-1 text-xs text-ink-faint">
            Parity: {phase.parity}
            {phase.femaleWeightLossKgDay !== undefined
              ? ` · female weight loss ${phase.femaleWeightLossKgDay} kg/day`
              : ""}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {groups.map((group) => (
          <Card key={group.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{group.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  {group.rows.map(([label, rowValue]) => (
                    <TableRow key={label}>
                      <TableCell className="text-sm text-ink-muted">{label}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-ink">
                        {rowValue}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Source semantics</CardTitle>
          <CardDescription>
            {programme.sourceProgramme?.source.includes("PIC")
              ? "PIC publishes the mature-boar amino-acid and phosphorus specifications relative to dietary energy. FeedSport shows the 3,175 kcal ME/kg reference-diet concentrations here and recalculates those targets when ME or NE is selected during formulation. PIC added vitamins and trace minerals are represented as supplementation targets, not natural ingredient content."
              : phase.species === "broiler"
                ? "These are direct Chapter 2 broiler requirements from the Brazilian Tables 2024. Phosphorus is formulated on available phosphorus: the published digestible-phosphorus requirement is not enforced because the inorganic phosphate sources carry no poultry digestible-phosphorus value. Poultry vitamin and trace-mineral supplementation is not loaded yet."
                : `These are direct ${phase.sourceTable.startsWith("6.") ? "Chapter 6 breeder" : "Chapter 5 growing-swine"} requirements from the Brazilian Tables 2024. Vitamin and trace-mineral values are intentionally not shown as requirements here: Chapter 7 describes those values as suggested supplementation levels.`}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
