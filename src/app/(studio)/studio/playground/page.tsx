import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Playground",
  description: "Try changes to a recipe and see cost and nutrients update. Nothing is saved until you send it to Studio.",
};

// Rendered by the studio in the layout; this route only sets the URL and title.
export default function Page() {
  return null;
}
