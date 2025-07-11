import React from 'react';
import { allBlogPosts } from '@/data/blog';
import { notFound } from 'next/navigation';
import { Metadata, ResolvingMetadata } from 'next';
import Image from 'next/image';

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
    
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      image: post.image,
      author: {
        '@type': 'Person',
        name: post.author.name,
      },
      datePublished: new Date(post.date).toISOString(),
      description: post.excerpt,
      articleBody: post.content.replace(/<[^>]*>?/gm, ''), // Simple strip of HTML for body
    };

    return (
        <main className="bg-white py-12">
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <article className="max-w-4xl mx-auto px-4">
              <header className="mb-8 text-center">
                  <p className="text-base text-green-600 font-semibold tracking-wide uppercase">{post.category}</p>
                  <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl my-4">
                      {post.title}
                  </h1>
                  <div className="flex justify-center items-center space-x-4 text-gray-500">
                      <div className="flex items-center space-x-2">
                          <Image src={post.author.image} alt={post.author.name} width={40} height={40} className="rounded-full" />
                          <span>{post.author.name}</span>
                      </div>
                      <span>•</span>
                      <time dateTime={new Date(post.date).toISOString()}>
                          {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </time>
                      <span>•</span>
                      <span>{post.readingTime}</span>
                  </div>
              </header>

              <div className="relative h-96 w-full rounded-2xl overflow-hidden mb-12 shadow-lg">
                  <Image src={post.image} alt={post.title} fill className="object-cover"/>
              </div>

              <div
                className="prose prose-lg lg:prose-xl max-w-none mx-auto"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            </article>
        </main>
    );
};

export default BlogDetailPage;
