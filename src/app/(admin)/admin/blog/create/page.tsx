'use client';

import { BlogPostForm } from '@/components/admin/BlogPostForm';

export default function CreateBlogPostPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Create New Blog Post</h1>
      <BlogPostForm />
    </div>
  );
}
