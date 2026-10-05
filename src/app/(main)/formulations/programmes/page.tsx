import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FEED_PROGRAMMES } from "@/lib/feed-programmes";
import { feedProgrammeHref } from "@/lib/formulation-routes";

export default function FeedProgrammesPage() {
  const loaded = FEED_PROGRAMMES.filter((programme) => programme.status === "loaded").length;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Programmes</h1>
          <Badge variant="secondary">
            {loaded} source-backed programmes
          </Badge>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
          Programmes are loaded from explicit published sources. Brazilian Tables 2024 provides
          the growing, gilt, gestation and lactation requirements, while PIC supplies the mature-boar
          requirement programme. Brazilian Tables remains the canonical ingredient-composition source.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {FEED_PROGRAMMES.map((programme) => (
          <Card key={programme.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base">{programme.name}</CardTitle>
                <Badge variant="secondary">
                  {programme.status === "loaded" ? "Loaded" : "Not loaded"}
                </Badge>
              </div>
              <CardDescription className="leading-6">{programme.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Link
                href={feedProgrammeHref(programme.id)}
                className="text-sm font-medium text-brand hover:underline"
              >
                Open programme
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
