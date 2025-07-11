import React from 'react';
import { allBlogPosts } from '@/data/blog';
import { notFound } from 'next/navigation';
import { Metadata, ResolvingMetadata } from 'next';
import Image from 'next/image';
import { BlogPostDetail } from '@/components/blog/BlogPostDetail';

type Props = {
  params: { slug: string }
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const slug = params.slug;
  const post = allBlogPosts.find(p => p.slug === slug);

  if (!post) {
    return {
      title: 'Blog Post Not Found',
    }
  }

  const previousImages = (await parent).openGraph?.images || []

  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: `${post.title} | FeedSport Blog`,
      description: post.excerpt,
      type: 'article',
      publishedTime: new Date(post.date).toISOString(),
      authors: [post.author.name],
      images: [
        {
          url: post.image,
          width: 1200,
          height: 630,
          alt: post.title,
        },
        ...previousImages,
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${post.title} | FeedSport Blog`,
      description: post.excerpt,
      images: [post.image],
    },
  }
}

export async function generateStaticParams() {
  return allBlogPosts.map(post => ({
    slug: post.slug,
  }));
}

const BlogDetailPage = ({ params }: Props) => {
    const { slug } = params;
    const post = allBlogPosts.find(p => p.slug === slug);

    if (!post) {
      notFound();
    }
    
    return <BlogPostDetail post={post} />;
};

export default BlogDetailPage;
