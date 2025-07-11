
import SecondaryHero from '@/components/common/SecondaryHero';
import ProductCard from '@/components/products/ProductCard';
import { getProducts } from '@/data/products';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export async function generateStaticParams() {
    const products = getProducts();
    const categories = Array.from(new Set(products.map(p => p.ingredient?.category).filter(Boolean)));
    return categories.map(slug => ({ slug }));
}

export default function CategoryPage({ params }: { params: { slug: string } }) {
    const { slug } = params;
    const products = getProducts().filter(p => p.ingredient?.category === slug);

    if (products.length === 0) {
        notFound();
    }
    
    const categoryName = slug.replace('-', ' ');

    return (
        <>
            <SecondaryHero
                title={categoryName}
                subtitle={`Browse all products under the ${categoryName} category.`}
                minimal
            />
             <div className="container mx-auto px-4 py-12">
                <div className="flex items-center space-x-2 text-sm text-gray-500 mb-8">
                    <Link href="/products" className="hover:text-green-600">Products</Link>
                    <span>/</span>
                    <Link href="/products/categories" className="hover:text-green-600">Categories</Link>
                    <span>/</span>
                    <span className="text-gray-400 capitalize">{categoryName}</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {products.map(product => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        </>
    );
}

