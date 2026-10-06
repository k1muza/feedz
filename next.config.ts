import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  // Load GLPK from node_modules at runtime so its Node build can find glpk.wasm.
  serverExternalPackages: ['glpk.js'],
  // The spec-sheet PDF reads its embedded fonts from disk at request time.
  outputFileTracingIncludes: {
    '/api/products/[id]/spec-sheet': ['./src/assets/fonts/pdf/**'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'dy15acotyf9k1.cloudfront.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        // Supabase Storage public buckets
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
