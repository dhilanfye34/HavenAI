import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const SITE_URL = 'https://haven-ai-phi.vercel.app';
const TITLE = 'HavenAI — AI-Powered Personal Cybersecurity';
const DESCRIPTION =
  'Protect your device in real time with intelligent monitoring across files, apps, network activity, and email.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: '%s — HavenAI',
  },
  description: DESCRIPTION,
  applicationName: 'HavenAI',
  keywords: [
    'HavenAI',
    'AI cybersecurity',
    'personal security',
    'threat detection',
    'endpoint protection',
    'privacy',
  ],
  authors: [{ name: 'HavenAI' }],
  creator: 'HavenAI',
  publisher: 'HavenAI',
  // Favicon: app/icon.svg is auto-detected by Next.js App Router
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'HavenAI',
    title: TITLE,
    description: DESCRIPTION,
    locale: 'en_US',
    // Image auto-injected from app/opengraph-image.tsx
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    creator: '@havenai',
    // Image auto-injected from app/twitter-image.tsx
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
