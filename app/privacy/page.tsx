import { PublicHeader } from '@/components/PublicHeader';
import { Footer } from '@/components/Footer';

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      <main className="flex-1 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="glass-card">
            <h1 className="mb-8 text-4xl font-bold text-white md:text-5xl">
              Privacy
            </h1>

            <div className="space-y-8 text-white/90">
              <p className="text-sm text-white/70">
                Last updated: November 15, 2025
              </p>

              <div>
                <h2 className="mb-3 text-2xl font-semibold text-white">What we store</h2>
                <p className="leading-relaxed">
                  Focus Ramp stores the minimum information needed to provide the service:
                </p>
                <ul className="mt-3 space-y-2 pl-6">
                  <li className="list-disc">Your email address and authentication details (via Firebase Authentication)</li>
                  <li className="list-disc">Your focus plans: goal duration, end date, training days</li>
                  <li className="list-disc">Your focus days: daily targets and progress</li>
                  <li className="list-disc">Session logs: start times, durations, and completion status</li>
                  <li className="list-disc">User preferences: timer sounds, notification settings</li>
                </ul>
              </div>

              <div>
                <h2 className="mb-3 text-2xl font-semibold text-white">How we use it</h2>
                <p className="leading-relaxed">
                  We use your data exclusively to power the Focus Ramp experience:
                </p>
                <ul className="mt-3 space-y-2 pl-6">
                  <li className="list-disc">Generate and track your personalized training plan</li>
                  <li className="list-disc">Calculate progress, streaks, and history summaries</li>
                  <li className="list-disc">Sync your data across devices</li>
                  <li className="list-disc">Send you authentication and verification emails</li>
                </ul>
                <p className="mt-3 leading-relaxed">
                  We do not analyze, sell, or share your data with third parties for marketing or advertising purposes.
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-2xl font-semibold text-white">Infrastructure</h2>
                <p className="leading-relaxed">
                  Focus Ramp uses Firebase (by Google) for authentication and data storage. Your data is stored 
                  in secure, encrypted Firestore databases. Firebase's own privacy policy and security practices apply.
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-2xl font-semibold text-white">Your account</h2>
                <p className="leading-relaxed">
                  You can access, modify, or delete your data at any time through the app settings. 
                  If you delete your account, all associated data is removed from our systems.
                </p>
              </div>

              <div className="rounded-lg border border-white/20 bg-white/5 p-4">
                <p className="text-sm leading-relaxed text-white/80">
                  <strong className="text-white">Note:</strong> This privacy statement is a simple, 
                  honest description of how Focus Ramp handles your data. It is not a fully lawyer-reviewed 
                  legal document. A more formal privacy policy may be added in the future.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

