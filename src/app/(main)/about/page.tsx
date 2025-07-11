import SecondaryHero from '@/components/common/SecondaryHero';
import Image from 'next/image';
import Link from 'next/link';
import { FaAward, FaCheck, FaLeaf } from 'react-icons/fa';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about FeedSport\'s mission to redefine animal nutrition through science, sustainability, and innovation. Discover our values and commitment to farmer success.',
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: 'About Us | FeedSport',
    description: 'Learn about FeedSport\'s mission to redefine animal nutrition through science, sustainability, and innovation.',
    url: 'https://feedsport.co.zw/about',
    type: 'article',
  },
};


export default function AboutPage() {
  return (
    <>
      <SecondaryHero
        title="Empowering Farmers with Science-Backed Nutrition"
        subtitle="At FeedSport, we harness scientific research and sustainable practices to craft premium feed solutions that improve animal health, boost growth, and enhance farm profitability."
        ctaText="Browse Products"
        ctaLink="/products"
      />

      <div className="bg-gray-50 py-16">
        {/* Mission & Values Section */}
        <section className="flex flex-col lg:flex-row gap-10 mb-16 max-w-7xl mx-auto" aria-labelledby="mission-heading">

          <div className="lg:w-1/2">
            <div className="bg-white p-8 rounded-xl shadow-lg h-full flex flex-col">
              <div className="flex items-center mb-6">
                <div className="bg-green-100 p-3 rounded-full mr-4">
                  <FaLeaf className="text-green-600 text-xl" />
                </div>
                <h2 id="mission-heading" className="text-green-600 font-bold text-lg uppercase">
                  OUR MISSION
                </h2>
              </div>

              <h3 className="text-3xl font-bold mb-4 text-gray-900">
                Redefining Animal Nutrition
              </h3>

              <p className="mb-4 text-gray-700 text-lg leading-relaxed">
                We empower livestock producers with customized, research-driven feed that
                supports animal wellness, drives efficient growth, and promotes sustainable
                farming practices. Every formulation is backed by the latest scientific
                findings to ensure peak performance at every stage of development.
              </p>

              <p className="mb-6 text-gray-700 text-lg leading-relaxed">
                From precision micro-nutrient balancing to macro-nutrient optimization, we
                collaborate closely with farmers and researchers alike. Our goal is simple:
                healthier herds, happier producers, and a more sustainable future for
                agriculture.
              </p>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <div className="bg-green-100 p-1 rounded-full mr-3 mt-1">
                    <FaCheck className="text-green-600 text-sm" />
                  </div>
                  <span className="text-gray-700">
                    Premium, traceable ingredients sourced sustainably
                  </span>
                </li>
                <li className="flex items-start">
                  <div className="bg-green-100 p-1 rounded-full mr-3 mt-1">
                    <FaCheck className="text-green-600 text-sm" />
                  </div>
                  <span className="text-gray-700">
                    Tailored formulations for poultry, swine, and ruminants
                  </span>
                </li>
                <li className="flex items-start">
                  <div className="bg-green-100 p-1 rounded-full mr-3 mt-1">
                    <FaCheck className="text-green-600 text-sm" />
                  </div>
                  <span className="text-gray-700">
                    Rigorous quality control and lab‐tested consistency
                  </span>
                </li>
                <li className="flex items-start">
                  <div className="bg-green-100 p-1 rounded-full mr-3 mt-1">
                    <FaCheck className="text-green-600 text-sm" />
                  </div>
                  <span className="text-gray-700">
                    Efficient logistics for reliable, on-time delivery
                  </span>
                </li>
                <li className="flex items-start">
                  <div className="bg-green-100 p-1 rounded-full mr-3 mt-1">
                    <FaCheck className="text-green-600 text-sm" />
                  </div>
                  <span className="text-gray-700">
                    Dedicated technical support and ongoing R&D collaboration
                  </span>
                </li>
              </ul>
            </div>
          </div>


          <div className="lg:w-1/2">
            <div className="bg-white p-8 rounded-xl shadow-lg h-full">
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-100 rounded-xl overflow-hidden h-48">
                  <Image
                    width={500}
                    height={500}
                    src="/images/egg-dish.jpg"
                    alt="Healthy poultry enjoying our specialized feed"
                    className="w-full h-full object-cover transition duration-500 hover:scale-105"
                  />
                </div>
                <div className="bg-gray-100 rounded-xl overflow-hidden h-48">
                  <Image
                    width={500}
                    height={500}
                    src="/images/hero-4.png"
                    alt="Cattle feeding sustainably with our innovative products"
                    className="w-full h-full object-cover transition duration-500 hover:scale-105"
                  />
                </div>
              </div>
              <div className="flex items-center mb-6">
                <div className="bg-green-100 p-3 rounded-full mr-4">
                  <FaAward className="text-green-600 text-xl" />
                </div>
                <h2 className="text-green-600 font-bold text-lg">OUR VALUES</h2>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900">Sustainability</h3>
                  <p className="text-gray-700">We create eco-conscious formulations that minimize environmental impact without compromising nutrition.</p>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900">Innovation</h3>
                  <p className="text-gray-700">Our R&D experts continually refine our products using the latest advances in animal science.</p>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900">Integrity</h3>
                  <p className="text-gray-700">We uphold transparency in sourcing and production, fostering trust with our customers.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-green-600 rounded-xl p-8 md:p-12 text-white mb-16 max-w-7xl mx-auto" aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="text-3xl font-bold mb-8 text-center">Our Impact in Numbers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">10+</div>
              <p className="text-green-100">Years of Excellence</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">80+</div>
              <p className="text-green-100">Farms Partnered</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <p className="text-green-100">Dedicated Support</p>
            </div>
          </div>
        </section>

        {/* Team CTA */}
        <section className="bg-white rounded-xl shadow-lg overflow-hidden max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/2 p-8 md:p-12 bg-white rounded-lg shadow-lg">
              <h2 className="text-3xl font-extrabold mb-4 text-gray-900">
                Meet the FeedSport Specialists
              </h2>

              <p className="text-gray-700 mb-4 leading-relaxed">
                At FeedSport, precision is everything. Our nutritionists dive deep into the latest research to formulate diets that optimize growth rates, feed conversion ratios, and overall animal well-being.
              </p>

              <p className="text-gray-700 mb-4 leading-relaxed">
                Backed by field–tested veterinarians, we ensure every ingredient supports gut health, immune function, and resilience against common livestock challenges—so you see fewer setbacks and more consistent performance.
              </p>

              <p className="text-gray-700 mb-6 leading-relaxed">
                Our agricultural scientists harness on-farm trials and cutting-edge lab analyses to source and validate only the highest-quality raw materials, delivering feed strategies that are both cost-effective and environmentally responsible.
              </p>

              <Link
                href="/team"
                className="inline-block bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-300 text-white font-semibold py-3 px-8 rounded-full transition duration-300"
                aria-label="Explore our FeedSport team"
              >
                Explore Our Team
              </Link>
            </div>
            <div className="md:w-1/2 bg-gray-100 min-h-64">
              <Image
                width={800}
                height={600}
                src="/images/team-4.png"
                alt="The FeedSport team of nutritionists and scientists collaborating"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
