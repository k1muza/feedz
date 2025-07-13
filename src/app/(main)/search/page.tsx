

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { search } from '@/app/actions';
import SecondaryHero from '@/components/common/SecondaryHero';
import { Product, BlogPost } from '@/types';
import { Book, Package, Search as SearchIcon, Loader2 } from 'lucide-react';

type SearchResults = {
  products: Product[];
  blogPosts: BlogPost[];
};

function SearchPageComponent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (query) {
      const performSearch = async () => {
        setLoading(true);
        const searchResults = await search(query);
        setResults({
            products: searchResults.products as Product[],
            blogPosts: searchResults.blogPosts as BlogPost[],
        });
        setLoading(false);
      };
      performSearch();
    } else {
      setLoading(false);
      setResults({ products: [], blogPosts: [] });
    }
  }, [query]);

  return (
    <>
      <SecondaryHero
        title={query ? `Search Results for "${query}"` : 'Search'}
        subtitle={!loading && results ? `Found ${results.products.length} products and ${results.blogPosts.length} blog posts.` : 'Enter a query to search the site.'}
        minimal
      />
      <main className="container mx-auto px-4 py-12 max-w-7xl">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            <span className="ml-2 text-lg text-gray-600">Searching...</span>
          </div>
        ) : !results || (!results.products.length && !results.blogPosts.length) ? (
          <div className="text-center py-20">
            <SearchIcon className="mx-auto w-16 h-16 text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-800">No results found</h2>
            <p className="text-gray-500 mt-2">
              We couldn't find anything matching your search for "{query}". Try a different term.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {results.products.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <Package className="w-6 h-6 text-green-600"/> Products
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {results.products.map((product) => (
                    <ProductResultCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            )}
            
            {results.blogPosts.length > 0 && (
                <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <Book className="w-6 h-6 text-green-600"/> Blog Posts
                    </h2>
                    <div className="space-y-6">
                    {results.blogPosts.map((post) => (
                        <BlogResultCard key={post.id} post={post} />
                    ))}
                    </div>
                </section>
            )}

          </div>
        )}
      </main>
    </>
  );
}


export default function SearchPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="w-12 h-12 animate-spin text-gray-500" /></div>}>
            <SearchPageComponent />
        </Suspense>
    )
}

// --- Result Card Components ---

function ProductResultCard({ product }: { product: Product }) {
  return (
    <Link href={`/products/${product.id}`} className="block bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className="relative w-20 h-20 flex-shrink-0">
            <Image src={product.images[0]} alt={product.ingredient?.name || ''} fill className="object-contain rounded-md bg-gray-100" />
        </div>
        <div>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">{product.ingredient?.category?.replace(/-/g, ' ')}</span>
            <h3 className="font-semibold text-gray-800 mt-1">{product.ingredient?.name}</h3>
            <p className="text-sm text-gray-500 line-clamp-2 mt-1">{product.ingredient?.description}</p>
        </div>
      </div>
    </Link>
  );
}

function BlogResultCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="block bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-4">
            <div className="relative w-24 h-24 flex-shrink-0 hidden sm:block">
                <Image src={post.image} alt={post.title} fill className="object-cover rounded-md" />
            </div>
             <div>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">{post.category}</span>
                <h3 className="font-semibold text-gray-800 mt-1 text-lg">{post.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mt-1">{post.excerpt}</p>
                 <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                    <Image src={post.author.image} alt={post.author.name} width={20} height={20} className="rounded-full" />
                    <span>{post.author.name}</span>
                    <span>&bull;</span>
                    <span>{new Date(post.date).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    </Link>
  );
}
