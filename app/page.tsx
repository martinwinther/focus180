'use client';

import Link from 'next/link';
import { PublicHeader } from '@/components/PublicHeader';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/components/AuthProvider';

export default function LandingPage() {
  const { user } = useAuth();
  const ctaHref = user ? '/today' : '/onboarding';
  const ctaText = user ? 'Go to today' : 'Get started';

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
          <div className="w-full max-w-4xl">
            <div className="glass-card text-center">
              {/* Logo Mark */}
              <div className="mb-8 flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/20 backdrop-blur-sm ring-2 ring-white/20">
                  <svg
                    className="h-10 w-10 text-white"
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
              </div>

              {/* Main Headline */}
              <h1 className="mb-6 text-5xl font-bold text-white md:text-6xl lg:text-7xl">
                Build your focus, one&nbsp;training&nbsp;day at&nbsp;a&nbsp;time
              </h1>

              {/* Subheading */}
              <p className="mx-auto mb-10 max-w-2xl text-lg text-white/90 md:text-xl">
                Set a focus goal, choose an end date, and get a gradual Pomodoro-based training plan. 
                No pressure. No perfectionism. Just steady progress.
              </p>

              {/* Primary CTAs */}
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link href={ctaHref} className="btn-primary w-full sm:w-auto">
                  {ctaText}
                </Link>
                {!user && (
                  <Link href="/auth/signin" className="btn-secondary w-full sm:w-auto">
                    Sign in
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-12 text-center text-3xl font-bold text-white md:text-4xl">
              How it works
            </h2>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Step 1 */}
              <div className="glass-card text-center">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 backdrop-blur-sm">
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
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                </div>
                <h3 className="mb-3 text-xl font-semibold text-white">
                  Set your focus goal
                </h3>
                <p className="text-white/80">
                  Choose your target focus duration, end date, and training days per week. 
                  We'll calculate the perfect ramp for you.
                </p>
              </div>

              {/* Step 2 */}
              <div className="glass-card text-center">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 backdrop-blur-sm">
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
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <h3 className="mb-3 text-xl font-semibold text-white">
                  Train day by day
                </h3>
                <p className="text-white/80">
                  Follow the guided Pomodoro sessions that gradually increase. 
                  Work in focused intervals, take breaks, build the habit.
                </p>
              </div>

              {/* Step 3 */}
              <div className="glass-card text-center">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/20 backdrop-blur-sm">
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
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                </div>
                <h3 className="mb-3 text-xl font-semibold text-white">
                  Watch your focus grow
                </h3>
                <p className="text-white/80">
                  Track your progress with daily history, streak counts, and visual summaries. 
                  Celebrate the journey.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Who It's For Section */}
        <section className="px-4 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-12 text-center text-3xl font-bold text-white md:text-4xl">
              Who it's for
            </h2>

            <div className="glass-card">
              <ul className="space-y-4">
                <li className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20">
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-white">Knowledge workers</h3>
                    <p className="text-white/80">
                      Build the deep work capacity needed for complex projects and creative challenges.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20">
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-white">Students</h3>
                    <p className="text-white/80">
                      Train your attention span for studying, reading, and research without overwhelming yourself.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20">
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-white">Anyone building focus habits</h3>
                    <p className="text-white/80">
                      If you struggle to focus for long periods, start small and gradually work your way up with gentle, structured guidance.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="px-4 py-16">
          <div className="mx-auto max-w-3xl">
            <div className="glass-card text-center">
              <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
                Ready to build your focus?
              </h2>
              <p className="mb-8 text-lg text-white/90">
                Start your personalized training plan today.
              </p>
              <Link href={ctaHref} className="btn-primary">
                {ctaText}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
