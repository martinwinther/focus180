'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Dynamically import Firebase to avoid SSR issues
      const [
        { createUserWithEmailAndPassword, sendEmailVerification },
        { getFirebaseAuth },
      ] = await Promise.all([
        import('firebase/auth'),
        import('@/lib/firebase/client'),
      ]);

      const auth = await getFirebaseAuth();
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Configure email verification with continue URL
      // Note: 180focus.app must be listed under
      // Firebase → Authentication → Settings → Authorized domains
      // Redirects directly to sign-in after Firebase's verification page
      // Add verified=true param so we can show a success message
      const actionCodeSettings = {
        url: 'https://180focus.app/auth/signin?verified=true',
        handleCodeInApp: false,
      };

      await sendEmailVerification(userCredential.user, actionCodeSettings);
      setVerificationSent(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (verificationSent) {
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
            We&apos;ve sent a verification link to <strong>{email}</strong>.
            Please check your inbox and click the link to verify your account.
          </p>

          <div className="space-y-3">
            <Link href="/auth/signin" className="btn-primary block text-center">
              Continue to sign in
            </Link>
            <p className="text-center text-sm text-white/60">
              After verifying your email, you can sign in to access your focus plan.
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
          Create your account
        </h1>
        <p className="mb-6 text-center text-white/80">
          Start building your focus capacity today
        </p>

        {error && (
          <div
            id="signup-error"
            role="alert"
            aria-live="assertive"
            className="mb-4 rounded-lg bg-red-500/20 px-4 py-3 text-sm text-red-200 backdrop-blur-sm"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" aria-describedby={error ? 'signup-error' : undefined}>
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
              aria-invalid={!!error}
              autoComplete="email"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-white/90"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              required
              minLength={6}
              disabled={loading}
              aria-describedby="password-help"
              aria-invalid={!!error}
              autoComplete="new-password"
            />
            <p id="password-help" className="mt-1 text-xs text-white/60">
              Must be at least 6 characters
            </p>
          </div>

          <p className="text-xs text-white/60 text-center">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-white underline hover:text-white/80">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-white underline hover:text-white/80">
              Privacy Policy
            </Link>
          </p>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/60">
          Already have an account?{' '}
          <Link href="/auth/signin" className="text-white underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

