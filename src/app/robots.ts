import { MetadataRoute } from 'next';
import { absoluteUrl, siteConfig } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin', '/dashboard', '/login'],
    }],
    host: siteConfig.url,
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
