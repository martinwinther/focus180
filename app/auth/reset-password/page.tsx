'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);

  useEffect(() => {
    // Extract oobCode and mode from URL params (Firebase adds these)
    const code = searchParams.get('oobCode');
    const urlMode = searchParams.get('mode');
    
    setOobCode(code);
    setMode(urlMode);

    // Verify we have the required params
    if (!code || urlMode !== 'resetPassword') {
      setError('Invalid or expired reset link. Please request a new password reset.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (!oobCode) {
      setError('Invalid reset code. Please request a new password reset.');
      return;
    }

    setLoading(true);

    try {
      const [
        { confirmPasswordReset },
        { getFirebaseAuth },
      ] = await Promise.all([
        import('firebase/auth'),
        import('@/lib/firebase/client'),
      ]);

      const auth = await getFirebaseAuth();
      await confirmPasswordReset(auth, oobCode, password);
      
      setSuccess(true);
      
      // Redirect to sign in after 2 seconds
      setTimeout(() => {
        router.push('/auth/signin?passwordReset=true');
      }, 2000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes('expired') || err.message.includes('invalid')) {
          setError('This reset link has expired or is invalid. Please request a new password reset.');
        } else {
          setError('Failed to reset password. Please try again.');
        }
      } else {
        setError('Failed to reset password. Please try again.');
      }
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="glass-card w-full max-w-md">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/20">
              <svg
                className="h-8 w-8 text-green-400"
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
            </div>
          </div>

          <h1 className="mb-2 text-center text-3xl font-bold text-white">
            Password reset successful
          </h1>
          <p className="mb-6 text-center text-white/80">
            Your password has been reset. Redirecting you to sign in...
          </p>

          <Link href="/auth/signin" className="btn-primary block text-center">
            Go to sign in
          </Link>
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
          Set new password
        </h1>
        <p className="mb-6 text-center text-white/80">
          Enter your new password below.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/20 px-4 py-3 text-sm text-red-200 backdrop-blur-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-white/90"
            >
              New password
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
              disabled={loading || !oobCode}
            />
            <p className="mt-1 text-xs text-white/60">
              Must be at least 6 characters
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-medium text-white/90"
            >
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              required
              minLength={6}
              disabled={loading || !oobCode}
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading || !oobCode}
          >
            {loading ? 'Resetting password...' : 'Reset password'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/60">
          <Link href="/auth/forgot-password" className="text-white underline">
            Request a new reset link
          </Link>
          {' · '}
          <Link href="/auth/signin" className="text-white underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="glass-card w-full max-w-md">
          <div className="text-center text-white">Loading...</div>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}

