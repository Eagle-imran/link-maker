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
  title: "Link Maker: YouTube links that open in the app",
  description:
    "Make a YouTube link that opens the YouTube app instead of the Instagram or TikTok browser, so viewers can subscribe, like and comment.",
};

export const viewport: Viewport = { themeColor: "#000000" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}
