import type { Metadata } from 'next';
import '../../../../webapp/app/globals.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'HavenAI - Personal Cybersecurity',
  description: 'Your personal security guardian. Protects your files, apps, network, and email.',
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
