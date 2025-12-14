'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const [
        { sendPasswordResetEmail },
        { getFirebaseAuth },
      ] = await Promise.all([
        import('firebase/auth'),
        import('@/lib/firebase/client'),
      ]);

      const auth = await getFirebaseAuth();
      
      // Configure password reset email with continue URL
      // Note: 180focus.app must be listed under
      // Firebase → Authentication → Settings → Authorized domains
      const actionCodeSettings = {
        url: 'https://180focus.app/auth/reset-password',
        handleCodeInApp: false,
      };

      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      setEmailSent(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        // Don't reveal if email exists or not for security
        // Firebase will return an error for invalid emails, but we show a generic message
        if (err.message.includes('user-not-found')) {
          // Silently treat as success to prevent email enumeration
          setEmailSent(true);
        } else {
          setError('Failed to send reset email. Please try again.');
        }
      } else {
        setError('Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="glass-card w-full max-w-md">
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

          <h1 className="mb-2 text-center text-3xl font-bold text-white">
            Check your email
          </h1>
          <p className="mb-6 text-center text-white/80">
            If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link.
            Please check your inbox and click the link to reset your password.
          </p>

          <div className="space-y-3">
            <Link href="/auth/signin" className="btn-primary block text-center">
              Back to sign in
            </Link>
            <p className="text-center text-sm text-white/60">
              Didn&apos;t receive the email? Check your spam folder or try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass-card w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link href="/">
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
          </Link>
        </div>

        <h1 className="mb-2 text-center text-3xl font-bold text-white">
          Reset password
        </h1>
        <p className="mb-6 text-center text-white/80">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/20 px-4 py-3 text-sm text-red-200 backdrop-blur-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-white/90"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@example.com"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/60">
          Remember your password?{' '}
          <Link href="/auth/signin" className="text-white underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

