import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpen, FlaskConical, LayoutDashboard, Layers3, Wheat } from "lucide-react";

import { feedFormulationHref } from "@/lib/formulation-routes";

const nav = [
  { href: feedFormulationHref(), label: "Dashboard", icon: LayoutDashboard },
  { href: feedFormulationHref("programmes"), label: "Programmes", icon: BookOpen },
  { href: feedFormulationHref("formulations"), label: "My formulations", icon: Layers3 },
  { href: feedFormulationHref("ingredients"), label: "Ingredients", icon: Wheat },
  { href: feedFormulationHref("nutrients"), label: "Nutrients", icon: FlaskConical },
];

export default function FormulationsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-plane text-ink">
      <div className="border-b border-hairline bg-surface">
        <div className="fs-frame overflow-x-auto py-3">
          <nav className="flex min-w-max items-center gap-1" aria-label="Feed formulation">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-ink-muted transition hover:bg-raised hover:text-brand"
              >
                <Icon size={16} strokeWidth={1.75} />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="fs-page max-w-[1500px]">{children}</div>
    </div>
  );
}
