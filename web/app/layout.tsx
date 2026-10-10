import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { RouteProgress } from '@/components/navigation/route-progress';
import { RouteToasts } from '@/components/navigation/route-toasts';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  applicationName: 'Expenn',
  title: {
    default: 'Expenn - expense and travel management for teams',
    template: '%s | Expenn',
  },
  description:
    'Self-hosted expense, receipt, approval, and business-travel workflows for modern teams.',
  authors: [{ name: 'usmhic', url: 'https://github.com/usmhic' }],
  creator: 'usmhic',
  publisher: 'usmhic',
  icons: {
    icon: [{ url: '/icon-16.png', sizes: '16x16' }, { url: '/icon-32.png', sizes: '32x32' }],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  openGraph: { images: [{ url: '/social-card.png', width: 1200, height: 630, alt: 'Expenn' }] },
  twitter: { card: 'summary_large_image', images: ['/social-card.png'] },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>
          <ThemeProvider>
            <Suspense fallback={null}>
              <RouteProgress />
            </Suspense>
            {children}
            <Suspense fallback={null}>
              <RouteToasts />
            </Suspense>
            <Toaster richColors closeButton />
          </ThemeProvider>
        </RootProvider>
      </body>
    </html>
  );
}
