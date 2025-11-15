'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, isVerified, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="glass-card">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white"></div>
            <p className="text-white">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!isVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="glass-card max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
              <svg
                className="h-8 w-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>

          <h1 className="mb-3 text-2xl font-bold text-white">
            Email verification required
          </h1>
          <p className="mb-6 text-white/80">
            Please verify your email address to access Focus Ramp. Check your inbox for the verification link.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => {
                signOut();
                router.push('/auth/signin');
              }}
              className="btn-secondary w-full"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <span className="text-lg font-semibold text-white">Focus Ramp</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/today"
                className={`nav-link ${pathname === '/today' ? 'nav-link-active' : ''}`}
              >
                Today
              </Link>
              <Link
                href="/history"
                className={`nav-link ${pathname === '/history' ? 'nav-link-active' : ''}`}
              >
                History
              </Link>
              <Link
                href="/settings"
                className={`nav-link ${pathname === '/settings' ? 'nav-link-active' : ''}`}
              >
                Settings
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-sm text-white/80">
                {user.email}
              </div>
              <button
                onClick={signOut}
                className="rounded-lg px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>

      <nav className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 md:hidden">
        <div className="glass-nav flex items-center gap-1 px-2 py-2">
          <Link
            href="/today"
            className={`nav-link ${pathname === '/today' ? 'nav-link-active' : ''}`}
          >
            Today
          </Link>
          <Link
            href="/history"
            className={`nav-link ${pathname === '/history' ? 'nav-link-active' : ''}`}
          >
            History
          </Link>
          <Link
            href="/settings"
            className={`nav-link ${pathname === '/settings' ? 'nav-link-active' : ''}`}
          >
            Settings
          </Link>
        </div>
      </nav>
    </div>
  );
}
