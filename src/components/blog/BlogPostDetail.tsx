
'use client'

import { BlogPost } from "@/types";
import Image from "next/image";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { RelatedPostsSidebar } from "./RelatedPostsSidebar";
import { ShareButtons } from "./ShareButtons";
import { useState } from "react";
import { generateBlogPostAudio } from "@/app/actions";
import { Loader2, Volume2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export function BlogPostDetail({ post }: { post: BlogPost }) {
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const { toast } = useToast();

    const handleReadAloud = async () => {
        setIsGeneratingAudio(true);
        setAudioUrl(null);
        try {
            // Prepare a simplified version of the content for TTS
            const textToRead = `${post.title}. by ${post.author.name}. ${post.content}`;
            const result = await generateBlogPostAudio({ text: textToRead });
            setAudioUrl(result.audioDataUri);
        } catch (error) {
            console.error("Error generating audio:", error);
            toast({
                title: "Audio Generation Failed",
                description: "We couldn't generate the audio for this post. Please try again later.",
                variant: "destructive",
            });
        } finally {
            setIsGeneratingAudio(false);
        }
    };


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
        <main className="bg-gray-50 py-12 min-h-screen">
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <div className="container mx-auto max-w-7xl px-4">
                <div className="flex flex-col lg:flex-row gap-12">
                    {/* Main Content */}
                    <article className="lg:w-2/3 bg-white p-6 md:p-10 rounded-2xl shadow-lg border border-gray-100">
                      <header className="mb-10">
                          {/* Category badge */}
                          <div className="mb-4 flex justify-between items-center">
                            <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                              {post.category}
                            </span>
                             <button
                                onClick={handleReadAloud}
                                disabled={isGeneratingAudio}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isGeneratingAudio ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin"/>
                                        <span>Generating Audio...</span>
                                    </>
                                ) : (
                                    <>
                                        <Volume2 className="w-4 h-4"/>
                                        <span>Read Aloud</span>
                                    </>
                                )}
                            </button>
                          </div>
                          
                          {audioUrl && (
                                <div className="my-6">
                                    <audio controls autoPlay className="w-full">
                                        <source src={audioUrl} type="audio/wav" />
                                        Your browser does not support the audio element.
                                    </audio>
                                </div>
                          )}
                          
                          {/* Title with better spacing */}
                          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight tracking-tight mb-6">
                            {post.title}
                          </h1>
                          
                          {/* Author info with better spacing */}
                          <div className="flex flex-wrap items-center gap-4 text-gray-600">
                              <div className="flex items-center space-x-3">
                                  <Image 
                                    src={post.author.image} 
                                    alt={post.author.name} 
                                    width={48} 
                                    height={48} 
                                    className="rounded-full object-cover"
                                  />
                                  <div>
                                    <span className="block font-medium text-gray-900">{post.author.name}</span>
                                    <span className="text-sm">
                                      {post.author.role}
                                    </span>
                                  </div>
                              </div>
                              
                              <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>
                              
                              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 text-sm">
                                <time 
                                  dateTime={new Date(post.date).toISOString()}
                                  className="font-medium text-gray-700"
                                >
                                  {new Date(post.date).toLocaleDateString('en-US', { 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                  })}
                                </time>
                                <span className="hidden sm:block">•</span>
                                <span className="text-gray-600 font-medium">
                                  {post.readingTime} read
                                </span>
                              </div>
                          </div>
                      </header>

                      {/* Hero image with better styling */}
                      <div className="relative h-72 sm:h-80 md:h-96 w-full rounded-xl overflow-hidden mb-12 shadow-lg">
                          <Image 
                            src={post.image} 
                            alt={post.title} 
                            fill 
                            className="object-cover"
                            priority
                          />
                      </div>

                      {/* Content with enhanced typography */}
                      <div className="max-w-3xl mx-auto">
                        <div className="prose 
                                        prose-lg 
                                        prose-headings:font-heading
                                        prose-headings:text-gray-900
                                        prose-headings:font-bold
                                        prose-h1:text-3xl
                                        prose-h2:text-2xl
                                        prose-h3:text-xl
                                        prose-p:text-gray-700
                                        prose-p:leading-relaxed
                                        prose-p:mb-6
                                        prose-a:text-green-600 
                                        prose-a:font-medium
                                        prose-a:underline
                                        prose-a:underline-offset-4
                                        prose-a:decoration-green-300
                                        hover:prose-a:text-green-700
                                        hover:prose-a:decoration-green-500
                                        prose-strong:text-gray-900
                                        prose-blockquote:border-l-4
                                        prose-blockquote:border-green-500
                                        prose-blockquote:bg-green-50
                                        prose-blockquote:px-6
                                        prose-blockquote:py-3
                                        prose-blockquote:rounded-r-lg
                                        prose-blockquote:text-gray-700
                                        prose-blockquote:not-italic
                                        prose-figure:mx-auto
                                        prose-figcaption:text-center
                                        prose-figcaption:text-gray-500
                                        prose-figcaption:text-sm
                                        prose-img:rounded-lg
                                        prose-img:shadow-md
                                        prose-table:border
                                        prose-table:border-gray-200
                                        prose-th:bg-gray-100
                                        prose-th:px-4
                                        prose-th:py-3
                                        prose-th:text-left
                                        prose-th:text-gray-700
                                        prose-td:px-4
                                        prose-td:py-3
                                        prose-td:border-t
                                        prose-td:border-gray-200
                                        prose-ul:list-disc
                                        prose-ol:list-decimal
                                        prose-li:pl-2
                                        prose-li:my-2
                                        max-w-none"
                        >
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {post.content}
                          </ReactMarkdown>
                        </div>

                        <ShareButtons title={post.title} slug={post.slug} className="mt-16" />
                      </div>
                    </article>

                    {/* Sticky sidebar */}
                    <aside className="lg:w-1/3">
                        <div className="sticky top-24">
                            <RelatedPostsSidebar currentPostId={post.id} />
                            
                            {/* Additional reader-friendly element */}
                            <div className="mt-8 bg-green-50 p-6 rounded-xl border border-green-100">
                                <h3 className="font-bold text-lg mb-3 text-gray-800 flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                  </svg>
                                  Reading Tips
                                </h3>
                                <ul className="space-y-2 text-gray-600">
                                  <li className="flex items-start">
                                    <span className="text-green-600 mr-2">•</span>
                                    <span>Press <kbd className="bg-gray-200 px-2 py-1 rounded text-sm">Ctrl +</kbd> to enlarge text</span>
                                  </li>
                                  <li className="flex items-start">
                                    <span className="text-green-600 mr-2">•</span>
                                    <span>Bookmark this page for later reference</span>
                                  </li>
                                  <li className="flex items-start">
                                    <span className="text-green-600 mr-2">•</span>
                                    <span>Share with colleagues who might benefit</span>
                                  </li>
                                </ul>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </main>
    );
}
