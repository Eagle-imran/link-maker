import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Instrument_Sans } from "next/font/google";

const sans = Instrument_Sans({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ytopen: stop losing subscribers from your bio link",
  description:
    "Make YouTube links that open in the YouTube app instead of the Instagram or TikTok browser, so viewers are already signed in and can subscribe, like and comment in one tap.",
  // og:image comes from app/opengraph-image.tsx. On Vercel, Next.js makes it
  // absolute using the production domain.
  openGraph: {
    siteName: "ytopen",
    title: "Your bio link is losing subscribers",
    description:
      "Make YouTube links that open in the YouTube app, where viewers are already signed in.",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#000000" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}
