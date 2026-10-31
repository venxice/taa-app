import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { Providers } from '@/components/common/Providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'TAA-App — Teremil Assistance Application',
    template: '%s | TAA-App',
  },
  description:
    'Web-based subdivision assistance system for residents and Homeowner’s Association officers of Teremil Subdivision.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#15803d',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans antialiased">
        <Providers>
          {children}
          <Toaster position="top-right" richColors closeButton toastOptions={{ duration: 3000 }} />
        </Providers>
      </body>
    </html>
  );
}
