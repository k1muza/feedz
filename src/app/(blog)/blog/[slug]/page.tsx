
import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata, ResolvingMetadata } from 'next';
import { BlogPostDetail } from '@/components/blog/BlogPostDetail';
import SecondaryHero from '@/components/common/SecondaryHero';
import { getAllBlogPosts, getPostBySlug } from '@/app/actions';

type Props = {
  params: { slug: string }
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Blog Post Not Found',
    }
  }

  // Ensure the image URL is absolute for social sharing
  const imageUrl = post.image.startsWith('http') 
    ? post.image 
    : `https://feedsport.co.zw${post.image}`;

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
          url: imageUrl,
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
      images: [imageUrl],
    },
  }
}

export async function generateStaticParams() {
  const allPosts = await getAllBlogPosts();
  return allPosts.map(post => ({
    slug: post.slug,
  }));
}

const BlogDetailPage = async ({ params }: Props) => {
    const { slug } = params;
    const post = await getPostBySlug(slug);

    if (!post) {
      notFound();
    }
    
    return (
        <>
            <SecondaryHero
                badge={post.category}
                title={post.title}
                minimal
            />
            <BlogPostDetail post={post} />
        </>
    );
};

export default BlogDetailPage;
