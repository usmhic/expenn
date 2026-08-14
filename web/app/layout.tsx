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
    icon: '/icon.png',
    apple: '/icon.png',
  },
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
