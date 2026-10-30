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
  title: "Link Maker: stop losing subscribers from your bio link",
  description:
    "Make YouTube links that open in the YouTube app instead of the Instagram or TikTok browser, so viewers are already signed in and can subscribe, like and comment in one tap.",
};

export const viewport: Viewport = { themeColor: "#000000" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}
