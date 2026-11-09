import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://soraksora.kuma.id";

const siteTitle =
  process.env.NEXT_PUBLIC_SITE_TITLE || "SorakSora! — The Cheer Wall";

const siteDescription =
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
  "SorakSora — The Cheer Wall: papan sorak Neobrutalist real-time yang mengantarkan dukungan penonton langsung ke panggung, layar, dan smartwatch.";

const ogImageUrl =
  process.env.NEXT_PUBLIC_OG_IMAGE_URL || `${siteUrl}/og-image.png`;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 5.0,
  themeColor: "#FAF9F5",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  keywords: [
    "kata penyemangat",
    "pesan dukungan",
    "cheer wall digital",
    "The Cheer Wall",
    "SorakSora",
    "neobrutalism",
    "motivasi",
    "afirmasi positif",
    "dukungan hangat",
  ],
  authors: [{ name: "SorakSora Community" }],
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/safari-pinned-tab.svg",
        color: "#1A1A1A",
      },
    ],
  },
  openGraph: {
    type: "website",
    title: siteTitle,
    description: siteDescription,
    siteName: "SorakSora!",
    url: siteUrl,
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: siteTitle,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [ogImageUrl],
  },
  other: {
    "twitter:url": siteUrl,
    google: "notranslate",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      translate="no"
      suppressHydrationWarning
      className={`notranslate ${spaceGrotesk.variable} ${plusJakartaSans.variable}`}
    >
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body
        suppressHydrationWarning
        className="notranslate min-h-screen bg-[#F5F5F0] text-[#1A1A1A] antialiased selection:bg-[#FEF08A] selection:text-[#1A1A1A]"
      >
        {children}
      </body>
    </html>
  );
}
