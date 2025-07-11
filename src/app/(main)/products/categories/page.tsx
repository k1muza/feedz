
import SecondaryHero from '@/components/common/SecondaryHero';
import { getProducts } from '@/data/products';
import Link from 'next/link';
import { FaSeedling, FaBolt, FaGem, FaVial, FaPagelines, FaLeaf } from 'react-icons/fa';

const categoryDetails: { [key: string]: { icon: React.ReactNode; description: string; name: string; } } = {
    'protein-feeds': {
        icon: <FaSeedling className="w-8 h-8" />,
        description: 'Essential building blocks for muscle growth and development.',
        name: 'Protein Feeds'
    },
    'energy-feeds': {
        icon: <FaBolt className="w-8 h-8" />,
        description: 'High-starch ingredients to fuel daily activity and production.',
        name: 'Energy Feeds'
    },
    'minerals': {
        icon: <FaGem className="w-8 h-8" />,
        description: 'Crucial for bone structure, metabolic function, and overall health.',
        name: 'Minerals'
    },
    'amino-acids': {
        icon: <FaVial className="w-8 h-8" />,
        description: 'Pure, targeted supplements for precise diet formulation.',
        name: 'Amino Acids'
    },
    'forage-products': {
        icon: <FaPagelines className="w-8 h-8" />,
        description: 'High-fiber ingredients to support digestive health and satiety.',
        name: 'Forage Products'
    },
    'fiber-products': {
        icon: <FaLeaf className="w-8 h-8" />,
        description: 'Concentrated fiber sources to improve gut motility.',
        name: 'Fiber Products'
    },
};


export default function CategoriesPage() {
    const products = getProducts();
    const categories = Array.from(new Set(products.map(p => p.ingredient?.category).filter(Boolean))) as string[];

    return (
        <>
            <SecondaryHero
                title="Browse by Category"
                subtitle="Find the perfect ingredients for your formulation needs, organized by nutritional function."
            />
            <div className="bg-gray-50 py-16">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {categories.map(slug => {
                            const details = categoryDetails[slug] || { icon: <FaLeaf />, description: `View all ${slug.replace('-', ' ')} products`, name: slug.replace('-', ' ') };
                            return (
                                <Link key={slug} href={`/products/categories/${slug}`} className="block group">
                                    <div className="bg-white rounded-xl shadow-md p-8 h-full flex flex-col items-center text-center border-2 border-transparent group-hover:border-green-500 group-hover:shadow-xl transition-all duration-300 transform group-hover:-translate-y-1">
                                        <div className="text-green-600 mb-4 transition-transform duration-300 group-hover:scale-110">
                                            {details.icon}
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-2 capitalize">{details.name}</h3>
                                        <p className="text-gray-600 flex-grow">{details.description}</p>
                                        <span className="mt-6 text-sm font-medium text-green-600 group-hover:text-green-700">
                                            View Products &rarr;
                                        </span>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}
