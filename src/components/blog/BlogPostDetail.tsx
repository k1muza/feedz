// src/components/blog/BlogPostDetail.tsx
'use client'

import { BlogPost } from "@/types";
import Image from "next/image";

export function BlogPostDetail({ post }: { post: BlogPost }) {

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
                className="prose prose-lg lg:prose-xl max-w-none mx-auto prose-headings:text-gray-800 prose-a:text-green-600 hover:prose-a:text-green-700 prose-strong:text-gray-800 prose-blockquote:border-l-green-600 prose-blockquote:text-gray-600"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            </article>
        </main>
    );
}
