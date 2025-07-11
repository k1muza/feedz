
'use client'

import { BlogPost } from "@/types";
import Image from "next/image";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { RelatedPostsSidebar } from "./RelatedPostsSidebar";
import { ShareButtons } from "./ShareButtons";

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
        articleBody: post.content,
    };

    return (
        <main className="bg-gray-50 py-12">
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <div className="container mx-auto max-w-7xl px-4">
                <div className="flex flex-col lg:flex-row gap-12">
                    {/* Main Content */}
                    <article className="lg:w-2/3 bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                      <header className="mb-8">
                          <div className="flex items-center space-x-4 text-gray-500 text-sm">
                              <div className="flex items-center space-x-2">
                                  <Image src={post.author.image} alt={post.author.name} width={40} height={40} className="rounded-full" />
                                  <span className="font-medium text-gray-800">{post.author.name}</span>
                              </div>
                              <span>•</span>
                              <time dateTime={new Date(post.date).toISOString()}>
                                  {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                              </time>
                              <span>•</span>
                              <span>{post.readingTime}</span>
                          </div>
                      </header>

                      <div className="relative h-96 w-full rounded-2xl overflow-hidden mb-12 shadow-md">
                          <Image src={post.image} alt={post.title} fill className="object-cover"/>
                      </div>

                      <div
                        className="prose prose-lg lg:prose-xl max-w-none mx-auto prose-headings:text-gray-800 prose-a:text-green-600 hover:prose-a:text-green-700 prose-strong:text-gray-800 prose-blockquote:border-l-green-600 prose-blockquote:text-gray-600 prose-table:border prose-th:bg-gray-50 prose-th:p-2 prose-td:p-2 prose-td:border"
                      >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {post.content}
                        </ReactMarkdown>
                      </div>

                      <ShareButtons title={post.title} slug={post.slug} />

                    </article>

                    {/* Sidebar */}
                    <aside className="lg:w-1/3">
                        <RelatedPostsSidebar currentPostId={post.id} />
                    </aside>
                </div>
            </div>
        </main>
    );
}
