import type { Metadata } from 'next';

// Demo page with sample data; keep it out of search results.
export const metadata: Metadata = {
  title: 'Sample feed recipe',
  robots: { index: false, follow: false },
};

export default function RecipeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
