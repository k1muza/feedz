import { BlogPost } from '@/types';
import Image from 'next/image';
import Link from 'next/link';

export default function BlogCard({ post }: { post: BlogPost }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-48 relative">
        <Image
          src={post.image}
          alt={post.title}
          fill
          className="object-cover"
        />
      </div>
      <div className="p-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <span>{post.category}</span>
          <span>•</span>
          <span>{post.readingTime}</span>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          <Link href={`/blog/${post.slug}`}>
            {post.title}
          </Link>
        </h3>
        <p className="text-gray-600 mb-4">{post.excerpt}</p>
        <Link
          href={`/blog/${post.slug}`}
          className="text-green-600 hover:text-green-800 font-medium inline-flex items-center"
        >
          Read more
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}