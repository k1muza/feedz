'use client'

import { BlogPost } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FaNewspaper } from "react-icons/fa";
import { getAllBlogPosts } from "@/app/actions";

interface RelatedPostsSidebarProps {
    currentPostId: string;
}

export function RelatedPostsSidebar({ currentPostId }: RelatedPostsSidebarProps) {
    const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);

    useEffect(() => {
        async function fetchPosts() {
            const allPosts = await getAllBlogPosts();
            const filtered = allPosts
                .filter(post => post.id !== currentPostId)
                .slice(0, 4);
            setRelatedPosts(filtered);
        }
        fetchPosts();
    }, [currentPostId]);

    return (
        <div className="sticky top-24 space-y-8">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                <h3 className="font-bold text-xl mb-4 flex items-center">
                    <FaNewspaper className="text-green-600 mr-3" />
                    Other Articles
                </h3>
                <ul className="space-y-4">
                    {relatedPosts.map(post => (
                        <li key={post.id}>
                            <Link href={`/blog/${post.slug}`} className="flex items-center space-x-4 group">
                                <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden relative">
                                    <Image
                                        src={post.image}
                                        alt={post.title}
                                        fill
                                        className="object-cover transform group-hover:scale-105 transition-transform duration-300"
                                    />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-green-600 font-medium">{post.category}</p>
                                    <h4 className="font-semibold text-gray-800 group-hover:text-green-700 transition-colors">
                                        {post.title}
                                    </h4>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
             <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-2xl border border-green-200">
              <h3 className="font-bold text-lg mb-3 text-gray-800">Need Expert Advice?</h3>
              <p className="text-gray-600 mb-4 text-sm">
                Our nutritionists are available to help with your feed formulation challenges.
              </p>
               <Link href="/contact" className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors block text-center">
                Contact Our Team
              </Link>
            </div>
        </div>
    );
}
