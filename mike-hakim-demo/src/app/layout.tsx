import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";
import { INTRO_HEAD_SCRIPT } from "@/components/site/intro";

const fraunces = localFont({
  src: [{ path: "../fonts/fraunces.woff2", style: "normal", weight: "300 800" }, { path: "../fonts/fraunces-i.woff2", style: "italic", weight: "300 800" }],
  variable: "--font-fraunces",
  display: "swap",
});
const manrope = localFont({ src: [{ path: "../fonts/manrope.woff2", weight: "300 800" }], variable: "--font-manrope", display: "swap" });

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mike-hakim-demo.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Mike Hakim Real Estate | Homes in Dearborn & Southeast Michigan", template: "%s | Mike Hakim Real Estate" },
  description: "Search homes, request private showings and work with Mike Hakim across Dearborn and Southeast Michigan. Demonstration website with sample listings.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Mike Hakim Real Estate",
    description: "Find your place. Search homes and request a showing in a few taps. Demo site with sample listings.",
    images: [{ url: "/og.jpg?v=1", width: 1200, height: 630, alt: "Mike Hakim Real Estate demo website" }],
    type: "website",
  },
  twitter: { card: "summary_large_image", images: ["/og.jpg?v=1"] },
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  other: { "tdm-reservation": "1" },
};
export const viewport: Viewport = { themeColor: "#0d1624", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${fraunces.variable} ${manrope.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_HEAD_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[300] focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">Skip to content</a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
