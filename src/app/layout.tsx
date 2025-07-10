import { GoogleAnalytics } from "@next/third-parties/google";
import { Metadata } from "next";
import { Inter as FontSans } from "next/font/google"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toaster";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

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
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased", fontSans.variable)}>
        {children}
        <Toaster />
      </body>

      <GoogleAnalytics gaId="G-EPHLVQPHS9" />
    </html>
  )
}
