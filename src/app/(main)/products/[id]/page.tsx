import { notFound } from 'next/navigation';
import { FaCertificate, FaCheck, FaLeaf, FaPhone, FaTruck, FaWhatsapp } from 'react-icons/fa';
import { Metadata, ResolvingMetadata } from 'next';
import ImageGallery from '@/components/products/ImageGallery';
import RelatedProducts from '@/components/products/RelatedProducts';
import Link from 'next/link';

import { getProductById, getAllProducts } from '@/app/actions';
import { TechnicalSpecs } from '@/components/products/TechnicalSpecs';
import SecondaryHero from '@/components/common/SecondaryHero';

type Props = {
  params: { id: string }
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const id = params.id
  const product = await getProductById(id)

  if (!product) {
    return {
      title: 'Product Not Found',
      description: 'The requested product could not be found.'
    }
  }

  const previousImages = (await parent).openGraph?.images || []

  return {
    title: `${product.ingredient?.name}`,
    description: product.ingredient?.description,
    alternates: {
      canonical: `/products/${product.id}`,
    },
    openGraph: {
      title: `${product.ingredient?.name} | FeedSport`,
      description: product.ingredient?.description,
      images: [
        {
          url: product.images[0],
          width: 800,
          height: 600,
          alt: product.ingredient?.name,
        },
        ...previousImages,
      ],
    },
  }
}

export async function generateStaticParams() {
  const products = await getAllProducts();
  return products.map(product => ({ id: product.id }));
}

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.ingredient?.name,
    image: product.images,
    description: product.ingredient?.description,
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: 'FeedSport',
    },
    offers: {
      '@type': 'Offer',
      url: `https://feedsport.co.zw/products/${product.id}`,
      priceCurrency: 'USD',
      price: product.price,
      availability: 'https://schema.org/InStock',
      priceValidUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(), // Valid for 1 year
    },
    // Assuming some reviews exist
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "25"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SecondaryHero
        title={product.ingredient?.name || 'Product Details'}
        subtitle={product.ingredient?.category?.replace('-', ' ') || 'Premium Feed Ingredient'}
        minimal
      />
      <main className="bg-white">
        {/* Product Header */}
        <div className="pt-6">
          <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <ol className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
              <li>
                <Link href="/products" className="hover:text-green-600">Products</Link>
              </li>
              <li><span aria-hidden="true">/</span></li>
              <li>
                <Link href={`/products/categories/${product.ingredient?.category}`} className="hover:text-green-600 capitalize">
                  {product.ingredient?.category?.replace('-', ' ')}
                </Link>
              </li>
               <li><span aria-hidden="true">/</span></li>
              <li aria-current="page">
                <span className="text-gray-400">{product.ingredient?.name}</span>
              </li>
            </ol>
          </nav>

          {/* Main Product Content */}
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-labelledby="product-heading">
             <h1 id="product-heading" className="sr-only">{product.ingredient?.name} Details</h1>
            <div className="lg:grid lg:grid-cols-2 lg:gap-8">
              {/* Image Gallery */}
              <div className="mb-8 lg:mb-0">
                <ImageGallery images={product.images} name={product.ingredient?.name || ''} />
              </div>

              {/* Product Info */}
              <div className="lg:pl-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{product.ingredient?.name}</h2>

                <div className="flex items-center mb-4">
                  {product.ingredient?.category && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded mr-2">
                      {product.ingredient.category.replace('-', ' ')}
                    </span>
                  )}
                  {product.certifications?.map(cert => (
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
                      <h4 className="font-medium">Applications</h4>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {product?.ingredient?.applications?.join(', ')}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <FaTruck className="text-green-500 mr-2" />
                      <h4 className="font-medium">Shipping</h4>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {product.shipping}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <FaCertificate className="text-green-500 mr-2" />
                      <h4 className="font-medium">Packaging</h4>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {product.packaging}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
                      <h4 className="font-medium">Stock</h4>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {product.stock} tons available
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Technical Specifications */}
        <section className="mt-16 border-t border-gray-200 py-12" aria-labelledby="tech-specs-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
             <h2 id="tech-specs-heading" className="sr-only">Technical Specifications for {product.ingredient?.name}</h2>
            <TechnicalSpecs compositions={product.ingredient?.compositions} />
          </div>
        </section>

        {/* Related Products */}
        <section className="bg-gray-50 py-12" aria-labelledby="related-products-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <RelatedProducts currentProductId={product.id} category={product.ingredient?.category} />
          </div>
        </section>
      </main>
    </>
  );
}
