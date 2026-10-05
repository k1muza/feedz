
import "@/app/globals.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/context/AuthContext";
import { dashboardThemeScript } from "@/lib/dashboard-theme";
import { absoluteUrl, serializeJsonLd, siteConfig, socialImage } from "@/lib/seo";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
})

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: 'FeedSport International | Feed Ingredients Zimbabwe',
    template: '%s | FeedSport International',
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.name, url: siteConfig.url }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  category: 'Animal nutrition',
  keywords: ['animal feed Zimbabwe', 'feed ingredients Zimbabwe', 'livestock nutrition', 'poultry feed ingredients', 'pig feed ingredients', 'cattle feed', 'feed formulation', 'FeedSport'],
  openGraph: {
    title: 'FeedSport International | Feed Ingredients Zimbabwe',
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [socialImage],
    locale: 'en_ZW',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FeedSport International | Feed Ingredients Zimbabwe',
    description: siteConfig.description,
    images: [socialImage.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.webp',
    shortcut: '/favicon.webp',
    apple: '/favicon.webp',
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteConfig.url}/#organization`,
      name: siteConfig.name,
      url: siteConfig.url,
      logo: absoluteUrl('/favicon.webp'),
      email: siteConfig.email,
      telephone: siteConfig.phone,
      address: {
        '@type': 'PostalAddress',
        ...siteConfig.address,
      },
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: siteConfig.phone,
        contactType: 'sales',
        areaServed: 'ZW',
        availableLanguage: 'English',
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${siteConfig.url}/#website`,
      name: siteConfig.name,
      alternateName: siteConfig.shortName,
      url: siteConfig.url,
      publisher: { '@id': `${siteConfig.url}/#organization` },
      inLanguage: 'en-ZW',
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: dashboardThemeScript }} />
      </head>
      <body
        className={cn("min-h-screen antialiased", archivo.variable, plexMono.variable)}
        suppressHydrationWarning={true}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationJsonLd) }}
        />
        <AuthProvider>
            {children}
        </AuthProvider>
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </body>
      <GoogleAnalytics gaId="G-EPHLVQPHS9" />
    </html>
  )
}
