import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import ClientMonitoring from '@/components/ClientMonitoring';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Focus Ramp – Build your focus capacity, gradually',
  description: 'Gradually build your focus capacity with guided Pomodoro training tailored to your goals. Set a focus goal, choose an end date, and follow a personalized training plan that grows with you.',
  keywords: ['focus', 'pomodoro', 'productivity', 'deep work', 'training', 'focus training', 'attention', 'concentration'],
  authors: [{ name: 'Focus Ramp' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#667eea',
  openGraph: {
    title: 'Focus Ramp – Build your focus capacity, gradually',
    description: 'Gradually build your focus capacity with guided Pomodoro training tailored to your goals.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Focus Ramp',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Focus Ramp – Build your focus capacity, gradually',
    description: 'Gradually build your focus capacity with guided Pomodoro training tailored to your goals.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        {/* Client-side monitoring initialization */}
        <ClientMonitoring />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

