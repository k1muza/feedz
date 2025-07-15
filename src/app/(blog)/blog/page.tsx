
import BlogCategories from '@/components/blog/BlogCategories';
import NewsletterSignup from '@/components/blog/NewsletterSignup';
import SecondaryHero from '@/components/common/SecondaryHero';
import { getAllBlogPosts } from '@/app/actions';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Feed Industry Insights & Resources',
  description: 'Explore expert knowledge on animal nutrition, feed additives, formulation strategies, and the latest research from the FeedSport team.',
  alternates: {
    canonical: '/blog',
  },
};


export default async function BlogPage() {
  const allPosts = await getAllBlogPosts();
  const featuredPost = allPosts.find(post => post.featured);
  const recentPosts = allPosts.filter(post => !post.featured);

  // Aggregate and count all tags
  const tagCounts = allPosts
    .flatMap(post => post.tags)
    .reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  // Get the most popular tags
  const popularTags = Object.entries(tagCounts)
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, 6)
    .map(([tag]) => tag);


  return (
    <>
      <SecondaryHero
        badge='Industry Knowledge'
        title="Feed Industry Insights"
        subtitle="Expert knowledge on animal nutrition, feed additives, and formulation strategies"
      />
      <main className="container mx-auto px-4 py-12 max-w-7xl">

        {/* Featured Post */}
        {featuredPost && (
          <section className="mb-24 relative" aria-labelledby="featured-post-heading">
            <h2 id="featured-post-heading" className="sr-only">Featured Post</h2>
            <div className="overflow-hidden rounded-2xl shadow-xl group">
              <div className="relative h-80 md:h-96">
                <Image
                  src={featuredPost.image}
                  alt={featuredPost.title}
                  fill
                  className="object-cover transform group-hover:scale-105 transition-transform duration-500"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
              <div className="absolute bottom-8 left-8 text-white">
                <span className="uppercase text-sm bg-green-600/80 px-3 py-1 rounded-full">
                  {featuredPost.category}
                </span>
                <h3 className="mt-4 text-3xl font-bold leading-snug">
                  {featuredPost.title}
                </h3>
                <Link
                  href={`/blog/${featuredPost.slug}`}
                  className="mt-4 inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full transition"
                >
                  Read More
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Articles Grid */}
          <div className="lg:w-2/3">
             <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                Latest Articles
              </h2>
              <Link href="/blog/categories" className="text-sm font-medium text-green-600 hover:text-green-700">
                View all categories →
              </Link>
            </div>
            
            {allPosts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {recentPosts.map(post => (
                    <article key={post.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100 flex flex-col">
                    <div className="h-48 relative">
                        <Image
                        src={post.image}
                        alt={post.title}
                        fill
                        className="object-cover"
                        />
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                        <div className="flex items-center mb-3">
                        <span className="text-xs font-medium text-green-600">{post.category}</span>
                        <span className="mx-2 text-gray-300">•</span>
                        <span className="text-xs text-gray-500">{post.readingTime}</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                        <Link href={`/blog/${post.slug}`} className="hover:text-green-700 transition-colors duration-200">
                            {post.title}
                        </Link>
                        </h3>
                        <p className="text-gray-600 mb-4 flex-grow">{post.excerpt}</p>
                        <div className="mt-auto">
                            <Link
                            href={`/blog/${post.slug}`}
                            className="inline-flex items-center text-green-600 hover:text-green-700 text-sm font-medium"
                            >
                            Read more
                            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            </Link>
                        </div>
                    </div>
                    </article>
                ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-gray-50 rounded-lg">
                    <h3 className="text-xl font-semibold text-gray-700">No articles found.</h3>
                    <p className="text-gray-500 mt-2">Check back later for more updates!</p>
                </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:w-1/3 space-y-8">
            <BlogCategories />

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-lg mb-4 flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Popular Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {popularTags.map(tag => (
                  <Link
                    key={tag}
                    href={`/blog/tags/${tag.toLowerCase().replace(/\s+/g, '-')}`}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm transition-colors"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </div>

            <NewsletterSignup />

            <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
              <h3 className="font-bold text-lg mb-3 text-gray-800">Need Expert Advice?</h3>
              <p className="text-gray-600 mb-4 text-sm">
                Our nutritionists are available to help with your feed formulation challenges.
              </p>
              <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors">
                Contact Our Team
              </button>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
