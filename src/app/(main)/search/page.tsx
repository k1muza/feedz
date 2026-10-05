import { permanentRedirect } from 'next/navigation';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  permanentRedirect(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
}
