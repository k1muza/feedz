'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BlogCategories() {
  const categories = [
    { name: 'All Articles', slug: '' },
    { name: 'Nutrition', slug: 'nutrition' },
    { name: 'Additives', slug: 'additives' },
    { name: 'Research', slug: 'research' },
    { name: 'Industry News', slug: 'industry-news' }
  ];

  const pathname = usePathname();

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <h3 className="font-bold text-lg mb-4">Categories</h3>
      <ul className="space-y-2">
        {categories.map(category => (
          <li key={category.slug}>
            <Link
              href={`/blog/${category.slug}`}
              className={`block px-3 py-2 rounded-lg hover:bg-gray-50 ${
                pathname === `/blog/${category.slug}`
                  ? 'bg-green-50 text-green-700 font-medium'
                  : 'text-gray-700'
              }`}
            >
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}