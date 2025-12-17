'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Check if user is coming from email verification or password reset
  useEffect(() => {
    // Check for our custom verified param or Firebase's verification params
    const verified = searchParams.get('verified');
    const passwordReset = searchParams.get('passwordReset');
    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');
    
    // If we have verification-related params, show success message
    if (verified === 'true' || mode === 'verifyEmail' || oobCode) {
      setEmailVerified(true);
      setSuccessMessage('Email verified! You can now sign in.');
      // Clean up URL by removing query params after showing message
      const url = new URL(window.location.href);
      url.search = '';
      window.history.replaceState({}, '', url.toString());
      // Auto-hide message after 5 seconds
      setTimeout(() => {
        setEmailVerified(false);
        setSuccessMessage('');
      }, 5000);
    }

    // If coming from password reset, show success message
    if (passwordReset === 'true') {
      setEmailVerified(true);
      setSuccessMessage('Password reset successful! You can now sign in with your new password.');
      // Clean up URL
      const url = new URL(window.location.href);
      url.search = '';
      window.history.replaceState({}, '', url.toString());
      // Auto-hide message after 5 seconds
      setTimeout(() => {
        setEmailVerified(false);
        setSuccessMessage('');
      }, 5000);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setNeedsVerification(false);

    try {
      // Dynamically import Firebase and Firestore to avoid SSR issues
      const [
        { signInWithEmailAndPassword },
        { getFirebaseAuth },
        { getActiveFocusPlanForUser },
      ] = await Promise.all([
        import('firebase/auth'),
        import('@/lib/firebase/client'),
        import('@/lib/firestore/focusPlans'),
      ]);

      const auth = await getFirebaseAuth();
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      if (!userCredential.user.emailVerified) {
        setNeedsVerification(true);
        setLoading(false);
        return;
      }

      // Check if user has an active plan
      const activePlan = await getActiveFocusPlanForUser(userCredential.user.uid);
      
      if (!activePlan) {
        // No plan exists, redirect to onboarding to create one
        router.push('/onboarding');
      } else {
        router.push('/today');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to sign in. Please check your credentials.');
      }
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      const [
        { sendEmailVerification },
        { getFirebaseAuth },
      ] = await Promise.all([
        import('firebase/auth'),
        import('@/lib/firebase/client'),
      ]);

      const auth = await getFirebaseAuth();
      if (!auth.currentUser) return;

      setResendLoading(true);
      setResendSuccess(false);

      // Configure email verification with continue URL
      // Note: 180focus.app must be listed under
      // Firebase → Authentication → Settings → Authorized domains
      // Redirects directly to sign-in after Firebase's verification page
      // Add verified=true param so we can show a success message
      const actionCodeSettings = {
        url: 'https://180focus.app/auth/signin?verified=true',
        handleCodeInApp: false,
      };

      await sendEmailVerification(auth.currentUser, actionCodeSettings);
      setResendSuccess(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to resend verification email.');
      }
    } finally {
      setResendLoading(false);
    }
  };

  if (needsVerification) {
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          <h1 className="mb-2 text-center text-3xl font-bold text-white">
            Email not verified
          </h1>
          <p className="mb-6 text-center text-white/80">
            Please verify your email address before signing in. Check your inbox for the verification link.
          </p>

          {resendSuccess && (
            <div className="mb-4 rounded-lg bg-green-500/20 px-4 py-3 text-sm text-green-200 backdrop-blur-sm">
              Verification email sent! Check your inbox.
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/20 px-4 py-3 text-sm text-red-200 backdrop-blur-sm">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleResendVerification}
              className="btn-primary w-full"
              disabled={resendLoading}
            >
              {resendLoading ? 'Sending...' : 'Resend verification email'}
            </button>
            <button
              onClick={() => setNeedsVerification(false)}
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
          Welcome back
        </h1>
        <p className="mb-6 text-center text-white/80">
          Sign in to continue your focus journey
        </p>

        {emailVerified && (
          <div className="mb-4 rounded-lg bg-green-500/20 border border-green-500/30 px-4 py-3 text-sm text-green-200 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-green-400 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>{successMessage || 'Email verified! You can now sign in.'}</span>
            </div>
          </div>
        )}

        {error && (
          <div
            id="signin-error"
            role="alert"
            aria-live="assertive"
            className="mb-4 rounded-lg bg-red-500/20 px-4 py-3 text-sm text-red-200 backdrop-blur-sm"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" aria-describedby={error ? 'signin-error' : undefined}>
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
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-white/90"
              >
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-white/70 underline hover:text-white/90"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              required
              disabled={loading}
              aria-invalid={!!error}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/60">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-white underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="glass-card w-full max-w-md">
          <div className="text-center text-white">Loading...</div>
        </div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}

