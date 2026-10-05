import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FEED_NUTRIENTS } from "@/lib/feed-nutrients";
import { feedNutrientHref } from "@/lib/formulation-routes";

const GROUPS = Array.from(new Set(FEED_NUTRIENTS.map((nutrient) => nutrient.group)));

export default function FeedNutrientsPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Nutrients</h1>
          <Badge variant="secondary">{FEED_NUTRIENTS.length} nutrient concepts</Badge>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
          Reference catalogue of nutrient concepts used by programmes, ingredients and diet
          validation. Open any nutrient for its role and loaded Brazilian Tables requirement values.
        </p>
      </div>

      {GROUPS.map((group) => (
        <Card key={group}>
          <CardHeader>
            <CardTitle className="text-base">{group}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {FEED_NUTRIENTS.filter((nutrient) => nutrient.group === group).map((nutrient) => (
              <Link
                key={nutrient.id}
                href={feedNutrientHref(nutrient.id)}
                className="rounded-lg border border-hairline bg-raised/30 p-4 transition hover:border-ink-faint/40 hover:bg-raised"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium text-ink">{nutrient.name}</div>
                  <Badge variant="secondary">{nutrient.shortName}</Badge>
                </div>
                <div className="mt-2 text-xs font-mono text-ink-faint">
                  {nutrient.units.join(" · ")}
                </div>
                <p className="mt-2 text-xs leading-5 text-ink-muted">{nutrient.description}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
