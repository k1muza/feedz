import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'],
    }],
    host: 'https://feedsport.co.zw',
    sitemap: 'https://feedsport.co.zw/sitemap.xml',
  };
}
