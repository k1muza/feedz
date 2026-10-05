import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { feedProgrammeById } from "@/lib/feed-programmes";
import { feedFormulationHref, feedProgrammePhaseHref } from "@/lib/formulation-routes";

export default async function FeedProgrammePage({
  params,
}: {
  params: Promise<{ programmeId: string }>;
}) {
  const { programmeId } = await params;
  const programme = feedProgrammeById(programmeId);
  if (!programme) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={feedFormulationHref("programmes")}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline"
        >
          <ArrowLeft size={14} />
          Programmes
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{programme.name}</h1>
          <Badge variant="secondary">
            {programme.status === "loaded" ? "Loaded" : "Not loaded"}
          </Badge>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
          {programme.description}
        </p>
      </div>

      {programme.status === "loaded" && programme.sourceProgramme ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Source</CardTitle>
              <CardDescription>
                {programme.sourceProgramme.source} · {programme.sourceProgramme.sourceVersion}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-ink-muted">
              {programme.sourceProgramme.sourceSections.join(" · ")}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Requirement phases</CardTitle>
              <CardDescription>
                Each phase has its own URL so a specific requirement set can be bookmarked or shared.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-hairline">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Phase</TableHead>
                      <TableHead>Published basis</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programme.phases.map((phase) => (
                      <TableRow key={phase.id}>
                        <TableCell className="font-medium text-ink">{phase.label}</TableCell>
                        <TableCell className="text-ink-muted">{phase.sourceWeightRange}</TableCell>
                        <TableCell className="capitalize text-ink-muted">
                          {phase.phaseClass}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={feedProgrammePhaseHref(programme.id, phase.id)}
                            aria-label={`Open ${phase.label}`}
                            className="inline-flex rounded-md p-1.5 text-brand hover:bg-brand-soft"
                          >
                            <ArrowRight size={15} />
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Programme data not loaded yet</CardTitle>
            <CardDescription>
              This programme is not currently available from the checked-in Brazilian Tables dataset.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
