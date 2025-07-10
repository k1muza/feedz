'use client';

import Link from 'next/link';
import { FaPhoneAlt } from 'react-icons/fa';

export default function CTASection() {
  return (
    <div className="py-20 bg-green-700 text-white text-center">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Optimize Your Livestock Nutrition?</h2>
        <p className="text-xl mb-8 max-w-2xl mx-auto">
          Our team of nutrition experts is ready to help you select the perfect feed for your animals&apos; needs.
        </p>
        <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <Link href="https://wa.me/263774684534"
            target="_blank"
            rel="noopener noreferrer" className="flex bg-yellow-500 hover:bg-yellow-600 text-green-900 font-bold py-3 px-8 rounded-lg">
            Contact Our Experts
          </Link>
          <Link href="tel:+263774684534" className="border-2 border-white hover:bg-white hover:text-green-900 font-bold py-3 px-8 rounded-lg flex">
            <FaPhoneAlt className="mr-2" /> Call Now
          </Link>
        </div>
      </div>
    </div>
  );
}
