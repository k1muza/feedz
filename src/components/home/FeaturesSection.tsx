'use client';

import { FaHeadset, FaSeedling, FaTrophy, FaTruck } from 'react-icons/fa';

export default function FeaturesSection() {
  const features = [
    {
      icon: <FaSeedling />,
      title: "Premium Ingredients",
      description: "100% natural, high-quality feed components"
    },
    {
      icon: <FaTruck />,
      title: "Fast Delivery",
      description: "Next-day farm delivery available"
    },
    {
      icon: <FaTrophy />,
      title: "Quality Certified",
      description: "ISO 9001 certified production"
    },
    {
      icon: <FaHeadset />,
      title: "Expert Support",
      description: "24/7 nutritionist consultation"
    }
  ];

  return (
    <div className="container mx-auto px-4 py-16 -mt-10 relative z-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {features.map((feature, index) => (
          <div key={index} className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="text-green-600 text-4xl mb-4 flex justify-center">
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold mb-2 text-green-800 text-center">{feature.title}</h3>
            <p className="text-gray-600 text-center">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
