import { notFound } from 'next/navigation';
import { FaCertificate, FaCheck, FaLeaf, FaPhone, FaTruck, FaWhatsapp } from 'react-icons/fa';

import ImageGallery from '@/components/products/ImageGallery';
import RelatedProducts from '@/components/products/RelatedProducts';
import Link from 'next/link';

import { ALL_PRODUCTS, getProductById } from '@/data/products';
import { TechnicalSpecs } from '@/components/products/TechnicalSpecs';
import SecondaryHero from '@/components/common/SecondaryHero';


export async function generateStaticParams() {
  // Fetch or define all possible product IDs
  return ALL_PRODUCTS.map(product => ({ id: product.id }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  return (
    <>
      <SecondaryHero
        title="Our Premium Product Line"
        subtitle="Discover scientifically-proven feed additives for optimal livestock performance"
        ctaText="View All Products"
        ctaLink="/products"
      />
      <div className="bg-white">
        {/* Product Header */}
        <div className="pt-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
              <Link href="/products" className="hover:text-green-600">Products</Link>
              <span>/</span>
              <Link href={`/products/${product.ingredient?.category}`} className="hover:text-green-600 capitalize">
                {product.ingredient?.category?.replace('-', ' ')}
              </Link>
              <span>/</span>
              <span className="text-gray-400">{product.ingredient?.name}</span>
            </div>
          </div>

          {/* Main Product Content */}
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="lg:grid lg:grid-cols-2 lg:gap-8">
              {/* Image Gallery */}
              <div className="mb-8 lg:mb-0">
                <ImageGallery images={product.images} name={product.ingredient?.name || ''} />
              </div>

              {/* Product Info */}
              <div className="lg:pl-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.ingredient?.name}</h1>

                <div className="flex items-center mb-4">
                  {product.ingredient?.category && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded mr-2">
                      {product.ingredient?.category.replace('-', ' ')}
                    </span>
                  )}
                  {product.certifications.map(cert => (
                    <span key={cert} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2">
                      {cert}
                    </span>
                  ))}
                </div>

                <p className="text-lg text-gray-600 mb-6">{product.ingredient?.description}</p>

                {/* Pricing */}
                <div className="mb-6">
                  <h3 className="text-2xl font-semibold text-gray-900">
                    ${product.price.toLocaleString()}/ton
                  </h3>
                  <p className="text-sm text-gray-500">MOQ: {product.moq} tons</p>
                </div>

                {/* Key Benefits */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Key Benefits</h3>
                  <ul className="space-y-2">
                    {product.ingredient?.key_benefits?.map((benefit: string, index: number) => (
                      <li key={index} className="flex items-center">
                        <FaCheck className="text-green-500 mr-2" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Call to Action */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link
                      href={`https://wa.me/263774684534?text=I'm interested in ${product.ingredient?.name} (Product ID: ${product.id})`}
                      target="_blank"
                      className="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium"
                    >
                      <FaWhatsapp className="mr-2" />
                      Inquire on WhatsApp
                    </Link>
                    <Link
                      href="tel:+263774684534"
                      className="flex items-center justify-center border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-lg font-medium"
                    >
                      <FaPhone className="mr-2" />
                      Call Our Sales Team
                    </Link>
                  </div>
                </div>

                {/* Product Highlights */}
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <FaLeaf className="text-green-500 mr-2" />
                      <span className="font-medium">Applications</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {product?.ingredient?.applications?.join(', ')}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <FaTruck className="text-green-500 mr-2" />
                      <span className="font-medium">Shipping</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {product.shipping}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <FaCertificate className="text-green-500 mr-2" />
                      <span className="font-medium">Packaging</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {product.packaging}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
                      <span className="font-medium">Stock</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {product.stock} tons available
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Specifications */}
        <div className="mt-16 border-t border-gray-200 py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <TechnicalSpecs compositions={product.ingredient?.compositions} />
          </div>
        </div>

        {/* Related Products */}
        <div className="bg-gray-50 py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <RelatedProducts currentProductId={product.id} category={product.ingredient?.category} />
          </div>
        </div>
      </div>
    </>
  );
}
