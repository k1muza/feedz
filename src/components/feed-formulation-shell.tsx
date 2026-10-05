"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ExternalLink,
  FlaskConical,
  Layers3,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Wheat,
  X,
} from "lucide-react";

import { feedFormulationHref } from "@/lib/formulation-routes";

const NAV = [
  { href: feedFormulationHref(), label: "Dashboard", icon: LayoutDashboard },
  { href: feedFormulationHref("programmes"), label: "Programmes", icon: BookOpen },
  { href: feedFormulationHref("formulations"), label: "Formulations", icon: Layers3 },
  { href: feedFormulationHref("ingredients"), label: "Ingredients", icon: Wheat },
  { href: feedFormulationHref("nutrients"), label: "Nutrients", icon: FlaskConical },
];

export function FeedFormulationShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-dvh bg-plane text-ink">
      {sidebarOpen ? (
        <>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-ink/20 lg:hidden"
          />
          <aside className="fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-hairline bg-surface lg:sticky lg:top-0 lg:z-auto lg:h-dvh">
            <div className="flex items-center justify-between gap-2 px-5 py-5">
              <Link href={feedFormulationHref()} className="flex items-center gap-2.5 text-left">
                <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <Wheat size={18} strokeWidth={1.75} />
                </span>
                <span>
                  <span className="block text-sm font-semibold tracking-tight">FeedSport</span>
                  <span className="block text-[11px] text-ink-faint">Formulation workspace</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Hide sidebar"
                className="rounded-md p-1.5 text-ink-faint transition hover:bg-raised hover:text-ink lg:hidden"
              >
                <X size={16} />
              </button>
            </div>

            <nav className="space-y-0.5 px-3">
              {NAV.map((item) => {
                const Icon = item.icon;
                const selected =
                  item.href === feedFormulationHref()
                    ? pathname === item.href
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={selected ? "page" : undefined}
                    onClick={() => {
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                      selected
                        ? "bg-brand-soft font-medium text-brand"
                        : "text-ink-muted hover:bg-raised hover:text-ink"
                    }`}
                  >
                    <Icon size={16} strokeWidth={1.75} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto border-t border-hairline p-4">
              <Link
                href="/"
                className="flex w-full items-center gap-2.5 rounded-lg border border-hairline px-3 py-2 text-sm text-ink-muted transition hover:bg-raised hover:text-ink"
              >
                <ExternalLink size={16} strokeWidth={1.75} />
                Public website
              </Link>
            </div>
          </aside>
        </>
      ) : null}

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-hairline bg-surface/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-[1500px] items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-expanded={sidebarOpen}
              aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              className="shrink-0 rounded-lg border border-hairline p-2 text-ink-muted transition hover:bg-raised hover:text-ink"
            >
              {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            </button>
            <div className="min-w-0">
              <div className="text-[11px] text-ink-faint">FeedSport / Formulation</div>
              <div className="truncate text-sm font-medium text-ink">
                {NAV.find((item) =>
                  item.href === feedFormulationHref()
                    ? pathname === item.href
                    : pathname.startsWith(item.href),
                )?.label ?? "Dashboard"}
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
