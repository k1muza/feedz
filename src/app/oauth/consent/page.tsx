import type { Metadata } from "next";
import { Suspense } from "react";

import { ConsentForm } from "./ConsentForm";

export const metadata: Metadata = {
  title: "Authorize access",
  robots: { index: false, follow: false },
};

// Supabase Auth's OAuth server sends people here (Site URL + the
// authorization path set under Authentication > OAuth Server) to approve an
// app, such as a Claude connector, using their FeedSport account.
export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf8f3] px-4 py-12 text-[#222420]">
      <Suspense>
        <ConsentForm />
      </Suspense>
    </main>
  );
}
