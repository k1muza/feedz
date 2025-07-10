'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaCheck } from 'react-icons/fa';

export default function AboutSection() {
  const stats = [
    { value: "4.8/5", label: "Ratings" },
    { value: "25+", label: "Feed Formulas" },
    { value: "3+", label: "Distribution Centers" },
    { value: "10", label: "Years Experience" }
  ];

  return (
    <div className="bg-gray-50 py-16">
      <div className="container mx-auto px-4 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-10">
          <div className="lg:w-1/2">
            <div className="bg-white p-8 rounded-xl shadow-md h-full">
              <h4 className="text-green-600 font-bold mb-3">ABOUT FEEDSPORT</h4>
              <h2 className="text-3xl font-bold mb-6">Leading Livestock Nutrition</h2>
              <p className="mb-4">
                FeedSport has been at the forefront of animal nutrition innovation, developing feed solutions that maximize growth, health, and productivity for farmers nationwide.
              </p>
              <p className="mb-6">
                Our team of agricultural scientists and nutritionists work tirelessly to formulate feeds that meet the specific needs of different livestock at every growth stage.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <FaCheck className="text-green-600 mr-3" />
                  <span>ISO 9001 certified production facilities</span>
                </li>
                <li className="flex items-center">
                  <FaCheck className="text-green-600 mr-3" />
                  <span>Custom feed formulations available</span>
                </li>
                <li className="flex items-center">
                  <FaCheck className="text-green-600 mr-3" />
                  <span>Nationwide distribution network</span>
                </li>
              </ul>
              <Link href="/about" className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full">
                Learn More
              </Link>
            </div>
          </div>
          <div className="lg:w-1/2">
            <div className="bg-white p-8 rounded-xl shadow-md h-full">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-100 rounded-xl overflow-hidden">
                  <Image
                    width={500}
                    height={500}
                    src="/images/egg-compare.jpg"
                    alt="Poultry farm"
                    className="w-full h-48 object-cover" />
                </div>
                <div className="bg-gray-100 rounded-xl overflow-hidden">
                  <Image
                    width={500}
                    height={500}
                    src="/images/farm-2.png"
                    alt="Cattle farm"
                    className="w-full h-48 object-cover" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                {stats.map((stat, index) => (
                  <div key={index} className="bg-gray-100 p-4 rounded-xl">
                    <p className="text-3xl font-bold text-green-700">{stat.value}</p>
                    <p className="text-gray-600">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
