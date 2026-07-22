import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Link Maker — open YouTube links in the app",
  description:
    "Turn any YouTube link into a smart link that opens the YouTube app instead of the in-app browser. More subscribers, more engagement.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
