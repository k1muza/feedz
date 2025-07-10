'use client';

import Image from 'next/image';
import { FaStar } from 'react-icons/fa';

export default function TestimonialsSection() {
  const testimonials = [
    {
      image: "/images/farmer-1.png",
      name: "James Mhashu",
      farm: "JJ Poultry Farm",
      rating: 5,
      quote: "Since switching to FeedSport, my egg production has increased by 20% and my birds are healthier than ever before."
    },
    {
      image: "/images/farmer-2.png",
      name: "Pamela Choto",
      farm: "Choto Dairy Farm",
      rating: 5,
      quote: "The dairy meal has increased my milk production by 3 liters per cow daily. The quality is consistent and my cows love it."
    }
  ];

  return (
    <div className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h4 className="text-green-600 font-bold mb-3">FARMER TESTIMONIALS</h4>
          <h2 className="text-3xl font-bold mb-4">What Our Customers Say</h2>
          <p className="text-gray-600">
            Hear from farmers who have transformed their operations with FeedSport nutrition solutions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white p-8 rounded-xl shadow-md">
              <div className="flex items-center mb-6">
                <Image
                  width={500}
                  height={500}
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-16 h-16 rounded-full object-cover mr-4" />
                <div>
                  <h4 className="font-bold">{testimonial.name}</h4>
                  <p className="text-gray-600 text-sm">{testimonial.farm}</p>
                </div>
              </div>
              <div className="flex mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <FaStar key={i} className="text-yellow-400" />
                ))}
              </div>
              <blockquote className="text-gray-700 italic mb-6">
                &quot;{testimonial.quote}&quot;
              </blockquote>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}