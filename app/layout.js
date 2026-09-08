import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_NAME = "SportSpot";
const SITE_DESCRIPTION =
  "Find pubs near you showing live football, check league tables, fixtures and results, and plan your matchday.";

export const metadata = {
  // Set NEXT_PUBLIC_SITE_URL once there's a production domain so social
  // preview images resolve to absolute URLs instead of localhost.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: `${SITE_NAME} — Find a Pub Showing the Game`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: `${SITE_NAME} — Find a Pub Showing the Game`,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    images: ["/SportSpot-Logo-Light.png"],
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Find a Pub Showing the Game`,
    description: SITE_DESCRIPTION,
    images: ["/SportSpot-Logo-Light.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
