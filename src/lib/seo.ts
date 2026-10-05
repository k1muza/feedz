import type { Metadata } from 'next';

export const siteConfig = {
  name: 'FeedSport International',
  shortName: 'FeedSport',
  url: 'https://feedsport.co.zw',
  description:
    'Feed ingredients, livestock nutrition support and practical feed formulation tools for farmers and feed manufacturers in Zimbabwe.',
  phone: '+263774684534',
  email: 'sales@feedsport.co.zw',
  address: {
    streetAddress: '2 William Pollet Road, Borrowdale',
    addressLocality: 'Harare',
    addressCountry: 'ZW',
  },
} as const;

export const socialImage = {
  url: '/opengraph-image.webp',
  width: 1024,
  height: 1024,
  alt: 'FeedSport International animal nutrition and feed ingredients',
};

export function absoluteUrl(path = '/') {
  return new URL(path, siteConfig.url).toString();
}

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
};

export function createPageMetadata({
  title,
  description,
  path,
}: PageMetadataOptions): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: siteConfig.name,
      locale: 'en_ZW',
      type: 'website',
      images: [socialImage],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [socialImage.url],
    },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
