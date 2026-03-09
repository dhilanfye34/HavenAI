import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HavenAI - AI-Powered Cybersecurity',
  description: 'Personal cybersecurity agent that learns your behavior and protects you from threats.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
