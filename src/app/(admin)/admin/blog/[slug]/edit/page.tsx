'use client';

import { BlogPostForm } from '@/components/admin/BlogPostForm';
import { getPostBySlug } from '@/app/actions';
import { notFound } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { BlogPost } from '@/types';

export default function EditBlogPostPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPost() {
      const fetchedPost = await getPostBySlug(slug);
      if (!fetchedPost) {
        notFound();
      }
      setPost(fetchedPost);
      setLoading(false);
    }
    fetchPost();
  }, [slug]);


  if (loading) {
    return <div>Loading...</div>; // Or a skeleton loader
  }

  return (
    <div>
      {post && <BlogPostForm post={post} />}
    </div>
  );
}
