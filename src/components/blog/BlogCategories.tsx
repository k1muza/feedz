
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAllBlogPosts } from '@/app/actions';

export default function BlogCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    async function fetchCategories() {
      const posts = await getAllBlogPosts();
      const uniqueCategories = Array.from(new Set(posts.map(post => post.category)));
      setCategories(uniqueCategories);
    }
    fetchCategories();
  }, []);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <h3 className="font-bold text-lg mb-4">Categories</h3>
      <ul className="space-y-2">
        <li>
          <Link
            href="/blog"
            className={`block px-3 py-2 rounded-lg hover:bg-gray-50 ${
              pathname === '/blog'
                ? 'bg-green-50 text-green-700 font-medium'
                : 'text-gray-700'
            }`}
          >
            All Articles
          </Link>
        </li>
        {categories.map(category => (
          <li key={category}>
            <Link
              href={`/blog/categories/${category.toLowerCase().replace(/\s+/g, '-')}`}
              className={`block px-3 py-2 rounded-lg hover:bg-gray-50 ${
                pathname === `/blog/categories/${category.toLowerCase().replace(/\s+/g, '-')}`
                  ? 'bg-green-50 text-green-700 font-medium'
                  : 'text-gray-700'
              }`}
            >
              {category}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
