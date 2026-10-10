import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#f3f0e8',
    theme_color: '#1d3a2a',
    icons: [{ src: '/favicon.webp', sizes: 'any', type: 'image/webp' }],
  };
}
