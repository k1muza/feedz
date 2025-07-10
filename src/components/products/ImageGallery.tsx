'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ImageGalleryProps {
    images: string[];
    name: string;
}

export default function ImageGallery({ images, name }: ImageGalleryProps) {
    const [selectedImage, setSelectedImage] = useState<number>(0);

    return (
        <div>
            {/* Main Image */}
            <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100 mb-4">
                <Image
                    src={images[selectedImage]}
                    alt={`${name} - Image ${selectedImage + 1}`}
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 1024px) 100vw, 50vw"
                />
            </div>

            {/* Thumbnails */}
            <div className="grid grid-cols-4 gap-2">
                {images.map((image, index) => (
                    <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={`relative aspect-square overflow-hidden rounded-lg bg-gray-100 ${selectedImage === index ? 'ring-2 ring-green-500' : ''}`}
                    >
                        <Image
                            src={image}
                            alt={`${name} thumbnail ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="100px"
                        />
                    </button>
                ))}
            </div>
        </div>
    );
}