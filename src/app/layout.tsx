
import "@/app/globals.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Metadata } from "next";
import { Inter as FontSans } from "next/font/google"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/context/AuthContext";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  metadataBase: new URL('https://feedsport.co.zw'),
  alternates: {
    canonical: '/',
  },
  title: {
    default: 'FeedSport International - AI-Optimized Animal Nutrition',
    template: '%s | FeedSport International',
  },
  description: "Pioneering animal nutrition with AI-optimized feed solutions. We provide premium, scientifically-formulated ingredients to empower farmers and boost livestock performance.",
  keywords: ['animal feed', 'livestock nutrition', 'poultry feed', 'cattle feed', 'swine feed', 'aquafeed', 'feed ingredients', 'FeedSport'],
  openGraph: {
    title: 'FeedSport International - AI-Optimized Animal Nutrition',
    description: 'Precision-formulated supplements to maximize growth efficiency and herd health.',
    url: 'https://feedsport.co.zw',
    siteName: 'FeedSport International',
    images: [
      {
        url: '/images/og-image.png', // Must be an absolute URL
        width: 1200,
        height: 630,
        alt: 'FeedSport International a pioneer in animal nutrition',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FeedSport International - AI-Optimized Animal Nutrition',
    description: 'Precision-formulated supplements to maximize growth efficiency and herd health.',
    images: ['/images/og-image.png'], // Must be an absolute URL
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn("min-h-screen bg-background font-sans antialiased", fontSans.variable)}
        suppressHydrationWarning={true}
      >
        <AuthProvider>
            {children}
        </AuthProvider>
        <Toaster />
      </body>
      <GoogleAnalytics gaId="G-EPHLVQPHS9" />
    </html>
  )
}
