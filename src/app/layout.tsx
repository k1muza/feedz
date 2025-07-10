import { GoogleAnalytics } from "@next/third-parties/google";
import { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FeedSport International",
  description: "Providing agricultural solutions to farmers.",
};

export default function RootLayout({
  children, // Will be either main or invoice layout + pages
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>

      <GoogleAnalytics gaId="G-EPHLVQPHS9" />
    </html>
  )
}
