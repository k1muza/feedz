'use client';

import { motion } from 'framer-motion';
import { FaFlask, FaLeaf, FaShieldAlt, FaArrowRight } from 'react-icons/fa';
import Link from 'next/link';
import Image from 'next/image';
import ProductsSection from '@/components/home/ProductsSection';

const cardVariants = {
  offscreen: {
    y: 50,
    opacity: 0,
  },
  onscreen: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      bounce: 0.4,
      duration: 0.8,
    },
  },
};

const categoryData = [
    { name: 'Protein Feeds', description: 'High-quality protein sources for muscle development.', icon: <FaLeaf/>, href: '/products/categories/protein-feeds' },
    { name: 'Energy Feeds', description: 'Fueling growth and performance with premium energy.', icon: <FaLeaf/>, href: '/products/categories/energy-feeds' },
    { name: 'Minerals & Additives', description: 'Essential nutrients for health and vitality.', icon: <FaLeaf/>, href: '/products/categories/minerals' },
];

export default function IngredientsPage() {
  return (
    <main className="bg-gray-50 text-gray-800">
      {/* Hero Section */}
      <motion.section
        className="relative min-h-screen flex items-center justify-center text-center text-white bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div className="absolute inset-0 z-0">
            <Image
                src="/images/cattle-1.jpg"
                alt="Background of various feed ingredients like corn, soy, and wheat"
                data-ai-hint="grains macro"
                fill
                priority
                className="object-cover opacity-20"
            />
        </div>
        <div className="relative z-10 p-4">
          <motion.h1
            className="text-4xl md:text-6xl font-extrabold mb-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            The Foundation of <span className="text-green-400">Peak Performance</span>
          </motion.h1>
          <motion.p
            className="text-lg md:text-xl max-w-3xl mx-auto text-gray-300 mb-8"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Discover our comprehensive portfolio of premium feed ingredients, scientifically proven to unlock the full genetic potential of your livestock.
          </motion.p>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <Link href="/products" className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full text-lg transition-transform duration-300 hover:scale-105">
              Explore All Products
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* Categories Section */}
      <section className="py-16" aria-labelledby="ingredient-categories-heading">
        <div className="container mx-auto px-4">
          <h2 id="ingredient-categories-heading" className="text-3xl font-bold text-center mb-10">Our Core Ingredient Categories</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {categoryData.map((category, index) => (
              <motion.div
                key={index}
                className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 flex flex-col items-center text-center"
                variants={cardVariants}
                initial="offscreen"
                whileInView="onscreen"
                viewport={{ once: true, amount: 0.5 }}
              >
                <div className="text-4xl text-green-600 mb-4">{category.icon}</div>
                <h3 className="text-2xl font-bold mb-2">{category.name}</h3>
                <p className="text-gray-600 mb-4 flex-grow">{category.description}</p>
                <Link href={category.href} className="text-green-600 font-semibold hover:underline">
                  View Products <FaArrowRight className="inline-block ml-1" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-white py-16" aria-labelledby="benefits-heading">
         <h2 id="benefits-heading" className="sr-only">Benefits of Our Ingredients</h2>
        <div className="container mx-auto px-4 grid md:grid-cols-3 gap-12 text-center">
            <div className="flex flex-col items-center">
                <div className="text-5xl text-green-500 mb-4"><FaLeaf /></div>
                <h3 className="text-xl font-bold mb-2">Uncompromising Quality</h3>
                <p>Rigorously tested, fully traceable raw materials for consistent, reliable performance in every batch.</p>
            </div>
            <div className="flex flex-col items-center">
                <div className="text-5xl text-green-500 mb-4"><FaFlask /></div>
                <h3 className="text-xl font-bold mb-2">Scientific Formulation</h3>
                <p>Our ingredients are backed by research to ensure optimal nutrient bioavailability and efficacy.</p>
            </div>
            <div className="flex flex-col items-center">
                <div className="text-5xl text-green-500 mb-4"><FaShieldAlt /></div>
                <h3 className="text-xl font-bold mb-2">Sustainable & Safe</h3>
                <p>Sourced responsibly to ensure a safe, secure, and sustainable supply chain for your peace of mind.</p>
            </div>
        </div>
      </section>

      <ProductsSection />

      {/* Final CTA Section */}
      <section className="bg-gray-800 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Partner with the Experts</h2>
          <p className="text-gray-300 max-w-2xl mx-auto mb-8">
            Let our team help you create custom feed formulations that drive profitability and animal health.
          </p>
          <Link href="/contact" className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-10 rounded-full text-lg transition-transform duration-300 hover:scale-105">
            Contact a Specialist
          </Link>
        </div>
      </section>
    </main>
  );
}