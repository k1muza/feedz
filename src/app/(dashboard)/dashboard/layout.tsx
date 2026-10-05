import type { ReactNode } from "react";

import { FeedFormulationShell } from "@/components/feed-formulation-shell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <FeedFormulationShell>{children}</FeedFormulationShell>;
}
