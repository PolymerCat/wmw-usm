import type { Metadata } from "next";
import {
  JetBrains_Mono,
  Merriweather,
  Source_Sans_3,
} from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  display: "swap",
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const appTitle = "Where's My Water?";
const appDescription =
  "Find nearest water stations in USM";
const socialImagePath = "/preview.png";
const metadataBaseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(metadataBaseUrl),
  title: appTitle,
  description: appDescription,
  applicationName: appTitle,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: appTitle,
    description: appDescription,
    url: "/",
    siteName: appTitle,
    locale: "en_MY",
    type: "website",
    images: [
      {
        url: socialImagePath,
        width: 864,
        height: 271,
        alt: "Where's My Water logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: appTitle,
    description: appDescription,
    images: [socialImagePath],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sourceSans.variable} ${merriweather.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
