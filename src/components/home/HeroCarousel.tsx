// components/HeroCarousel.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const carouselImages = [
  {
    id: 1,
    src: '/images/hero-1.png',
    alt: 'Premium animal feed ingredients in bulk storage',
  },
  {
    id: 2,
    src: '/images/hero-2.png',
    alt: 'Healthy chickens fed with quality nutrition',
  },
  {
    id: 3,
    src: '/images/hero-3.png',
    alt: 'Feed ingredients being delivered to farm',
  },
];

export default function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-advance every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev === carouselImages.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-[60vh] max-h-[800px] overflow-hidden">
      {/* Carousel Images */}
      <div className="relative w-full h-full">
        {carouselImages.map((image, index) => (
          <div
            key={image.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority={index === 0} // Only prioritize first image
              className="object-cover rounded-2xl shadow-2xl"
              sizes="90vw"
            />
            {/* Dark overlay for better text contrast */}
            <div className="absolute inset-0 bg-black/30 rounded-2xl" />
          </div>
        ))}
      </div>

      {/* Navigation Dots */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {carouselImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentIndex ? 'bg-white w-6' : 'bg-white/50'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}