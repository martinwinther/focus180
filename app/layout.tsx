import type { Metadata } from 'next';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { ViewportMeta } from '@/components/ViewportMeta';
import { StatusBarOverlay } from '@/components/StatusBarOverlay';
import { APP_NAME, APP_DESCRIPTION, APP_CANONICAL_URL } from '@/lib/config/appConfig';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: `${APP_NAME} – ${APP_DESCRIPTION.split('.')[0]}`,
  description: APP_DESCRIPTION,
  keywords: ['focus', 'pomodoro', 'productivity', 'deep work', 'training', 'focus training', 'attention', 'concentration'],
  authors: [{ name: APP_NAME }],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/favicon.ico' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '180 Focus',
  },
  openGraph: {
    title: `${APP_NAME} – ${APP_DESCRIPTION.split('.')[0]}`,
    description: APP_DESCRIPTION,
    type: 'website',
    locale: 'en_US',
    siteName: APP_NAME,
    url: APP_CANONICAL_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} – ${APP_DESCRIPTION.split('.')[0]}`,
    description: APP_DESCRIPTION,
  },
  metadataBase: new URL(APP_CANONICAL_URL),
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#667eea',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        <Script
          id="viewport-fit-fix"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var viewport = document.querySelector('meta[name="viewport"]');
                if (viewport) {
                  var content = viewport.getAttribute('content') || '';
                  if (!content.includes('viewport-fit=cover')) {
                    var newContent = content ? content + ', viewport-fit=cover' : 'width=device-width, initial-scale=1, viewport-fit=cover';
                    viewport.setAttribute('content', newContent.replace(/,\s*,/g, ',').replace(/^,\s*/, ''));
                  }
                } else {
                  var meta = document.createElement('meta');
                  meta.name = 'viewport';
                  meta.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
                  document.head.appendChild(meta);
                }
              })();
            `,
          }}
        />
        <StatusBarOverlay />
        <ViewportMeta />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

