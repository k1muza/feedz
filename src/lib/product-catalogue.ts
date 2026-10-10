import type { FeedProduct, ProductStatus } from '@/data/feedProducts';

export type ProductCatalogueFilters = {
  category: string;
  animal: string;
  status: 'all' | ProductStatus;
};

export const defaultProductCatalogueFilters: ProductCatalogueFilters = {
  category: 'All',
  animal: 'all',
  status: 'all',
};

export function normalizeProductQuery(query: string) {
  return query.trim().toLocaleLowerCase('en');
}

export function matchesProductQuery(product: FeedProduct, query: string) {
  const term = normalizeProductQuery(query);
  if (!term) return true;

  return [
    product.name,
    product.category,
    product.grade,
    product.description,
    ...product.specs.map((item) => item.label),
    ...product.animals,
    ...product.searchTerms,
  ].join(' ').toLocaleLowerCase('en').includes(term);
}

export function filterProducts(
  products: FeedProduct[],
  query: string,
  filters: ProductCatalogueFilters,
) {
  return products.filter((product) => (
    matchesProductQuery(product, query)
    && (filters.category === 'All' || product.category === filters.category)
    && (filters.animal === 'all' || product.animals.includes(filters.animal))
    && (filters.status === 'all' || product.status === filters.status)
  ));
}

export function hasActiveProductFilters(filters: ProductCatalogueFilters) {
  return filters.category !== 'All' || filters.animal !== 'all' || filters.status !== 'all';
}

export function productEmptyState(query: string, filters: ProductCatalogueFilters) {
  const normalizedQuery = query.trim();
  const hasQuery = Boolean(normalizedQuery);
  const hasFilters = hasActiveProductFilters(filters);

  if (hasQuery && hasFilters) {
    return {
      title: `Nothing matches “${normalizedQuery}” with the selected filters.`,
      description: 'Try changing the filters, or search for another ingredient.',
    };
  }
  if (hasQuery) {
    return {
      title: `Nothing matches “${normalizedQuery}” yet`,
      description: 'We may still be able to source it. Tell us what you need and how much.',
    };
  }
  return {
    title: 'No ingredients match the selected filters.',
    description: 'Try changing or clearing the selected filters.',
  };
}

export function productsHrefWithQuery(pathname: string, currentSearch: string, query: string) {
  const params = new URLSearchParams(currentSearch);
  const normalizedQuery = query.trim();
  if (normalizedQuery) params.set('q', normalizedQuery);
  else params.delete('q');
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

export function productsHrefWithoutFilters(pathname: string, currentSearch: string) {
  const params = new URLSearchParams(currentSearch);
  params.delete('category');
  params.delete('animal');
  params.delete('status');
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

export function productQuoteHref(productName: string) {
  return `https://wa.me/263774684534?text=${encodeURIComponent(`Please quote ${productName}`)}`;
}
