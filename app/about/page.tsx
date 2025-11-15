'use client';

import Link from 'next/link';
import { PublicHeader } from '@/components/PublicHeader';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/components/AuthProvider';

export default function AboutPage() {
  const { user } = useAuth();
  const ctaHref = user ? '/today' : '/onboarding';
  const ctaText = user ? 'Go to today' : 'Get started';

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      <main className="flex-1 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="glass-card">
            <h1 className="mb-8 text-4xl font-bold text-white md:text-5xl">
              About Focus Ramp
            </h1>

            <div className="space-y-6 text-white/90">
              <div>
                <h2 className="mb-3 text-2xl font-semibold text-white">The problem</h2>
                <p className="leading-relaxed">
                  Deep work is hard. Jumping from scattered attention to sustained focus of 2–3 hours 
                  feels impossible. Most productivity advice expects you to flip a switch and suddenly 
                  become a focus machine. That's not how attention works.
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-2xl font-semibold text-white">The idea</h2>
                <p className="leading-relaxed">
                  Focus Ramp treats focus capacity like a trainable skill. You set a goal (how many minutes 
                  you want to focus) and an end date. The app generates a gradual training plan using Pomodoro 
                  sessions that start small and grow over time. Each day, you follow the plan—work in focused 
                  intervals, take breaks, and slowly build the habit.
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-2xl font-semibold text-white">The philosophy</h2>
                <p className="leading-relaxed">
                  We believe in gentle progression over aggressive ambition. No productivity guilt. 
                  No shame for starting small. Focus Ramp is designed to meet you where you are and help 
                  you grow at a sustainable pace. The goal isn't perfection—it's progress.
                </p>
              </div>
            </div>

            <div className="mt-10 flex justify-center">
              <Link href={ctaHref} className="btn-primary">
                {ctaText}
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

