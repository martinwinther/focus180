'use client';

import Link from 'next/link';
import { useAuth } from './AuthProvider';

export function PublicHeader() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-white/5 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label="Focus Ramp home">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
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

          <nav className="flex items-center gap-6" aria-label="Public navigation">
            <Link 
              href="/about" 
              className="text-sm text-white/80 transition-colors hover:text-white"
            >
              About
            </Link>
            <Link 
              href="/privacy" 
              className="text-sm text-white/80 transition-colors hover:text-white"
            >
              Privacy
            </Link>
            
            {user ? (
              <Link href="/today" className="btn-primary !px-5 !py-2 !text-sm">
                Go to app
              </Link>
            ) : (
              <Link href="/auth/signin" className="btn-secondary !text-sm">
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

