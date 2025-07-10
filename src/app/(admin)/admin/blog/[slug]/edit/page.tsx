'use client';

import { BlogPostForm } from '@/components/admin/BlogPostForm';
import { allBlogPosts } from '@/data/blog';
import { notFound } from 'next/navigation';

export default function EditBlogPostPage({ params }: { params: { slug: string } }) {
  const post = allBlogPosts.find(p => p.slug === params.slug);

  if (!post) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Edit Blog Post</h1>
      <BlogPostForm post={post} />
    </div>
  );
}
