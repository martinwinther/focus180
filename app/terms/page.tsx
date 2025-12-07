import { PublicHeader } from '@/components/PublicHeader';
import { Footer } from '@/components/Footer';
import { APP_NAME, APP_CANONICAL_URL, APP_CONTACT_EMAIL } from '@/lib/config/appConfig';

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      <main className="flex-1 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="glass-card">
            <h1 className="mb-8 text-4xl font-bold text-white md:text-5xl">
              Terms of Service
            </h1>

            <div className="space-y-8 text-white/90">
              <p className="text-sm text-white/70">
                Last updated: December 7, 2025
              </p>

              <div>
                <h2 className="mb-3 text-2xl font-semibold text-white">Welcome to {APP_NAME}</h2>
                <p className="leading-relaxed">
                  {APP_NAME} is a web application that helps you build your focus capacity through 
                  structured Pomodoro-style training plans. By creating an account or using {APP_NAME}, 
                  you agree to these terms. If you don&apos;t agree, please don&apos;t use the service.
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-2xl font-semibold text-white">What {APP_NAME} provides</h2>
                <p className="leading-relaxed">
                  {APP_NAME} offers tools to:
                </p>
                <ul className="mt-3 space-y-2 pl-6">
                  <li className="list-disc">Create personalized focus training plans</li>
                  <li className="list-disc">Track your daily focus sessions using Pomodoro-style timers</li>
                  <li className="list-disc">Monitor your progress, streaks, and history</li>
                  <li className="list-disc">Gradually build up to your target daily focus time</li>
                </ul>
                <p className="mt-3 leading-relaxed">
                  The service is provided as-is, and we continuously work to improve it. Features may 
                  change over time as we develop the product.
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-2xl font-semibold text-white">Your account</h2>
                <p className="leading-relaxed">
                  To use {APP_NAME}, you need to create an account with a valid email address. You are 
                  responsible for:
                </p>
                <ul className="mt-3 space-y-2 pl-6">
                  <li className="list-disc">Keeping your login credentials secure</li>
                  <li className="list-disc">All activity that occurs under your account</li>
                  <li className="list-disc">Providing accurate information when signing up</li>
                </ul>
                <p className="mt-3 leading-relaxed">
                  You may delete your account at any time through the Settings page. When you delete 
                  your account, all your data (plans, progress, session logs) is permanently removed.
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-2xl font-semibold text-white">Acceptable use</h2>
                <p className="leading-relaxed">
                  {APP_NAME} is designed for personal productivity and focus training. When using the 
                  service, you agree not to:
                </p>
                <ul className="mt-3 space-y-2 pl-6">
                  <li className="list-disc">Attempt to access other users&apos; accounts or data</li>
                  <li className="list-disc">Use automated tools to scrape or overload the service</li>
                  <li className="list-disc">Interfere with or disrupt the service&apos;s operation</li>
                  <li className="list-disc">Use the service for any illegal purpose</li>
                </ul>
                <p className="mt-3 leading-relaxed">
                  We reserve the right to suspend or terminate accounts that violate these terms.
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-2xl font-semibold text-white">Intellectual property</h2>
                <p className="leading-relaxed">
                  The {APP_NAME} name, logo, design, and underlying code are owned by the creator of 
                  {APP_NAME}. You may not copy, modify, or redistribute any part of the service without 
                  permission.
                </p>
                <p className="mt-3 leading-relaxed">
                  Your data (focus plans, session logs, preferences) belongs to you. We only use it to 
                  provide and improve the service, as described in our Privacy page.
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-2xl font-semibold text-white">Service availability</h2>
                <p className="leading-relaxed">
                  We aim to keep {APP_NAME} available and reliable, but we cannot guarantee 100% uptime. 
                  The service may be temporarily unavailable due to maintenance, updates, or circumstances 
                  beyond our control.
                </p>
                <p className="mt-3 leading-relaxed">
                  We may also modify, suspend, or discontinue features (or the entire service) at any time, 
                  with or without notice. We&apos;ll try to give reasonable notice for significant changes.
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-2xl font-semibold text-white">Limitation of liability</h2>
                <p className="leading-relaxed">
                  {APP_NAME} is a productivity tool, not medical advice. The app is designed to help you 
                  build focus habits, but results depend on your own effort and circumstances.
                </p>
                <p className="mt-3 leading-relaxed">
                  To the maximum extent permitted by law, {APP_NAME} and its creator are not liable for 
                  any indirect, incidental, or consequential damages arising from your use of the service. 
                  This includes loss of data, loss of profits, or any other intangible losses.
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-2xl font-semibold text-white">Future paid features</h2>
                <p className="leading-relaxed">
                  {APP_NAME} is currently free to use. We may introduce paid features or subscription 
                  plans in the future. If we do, we&apos;ll clearly communicate what&apos;s free versus paid, 
                  and any payments will require your explicit consent.
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-2xl font-semibold text-white">Changes to these terms</h2>
                <p className="leading-relaxed">
                  We may update these terms from time to time. If we make significant changes, we&apos;ll 
                  notify you through the app or by email. Continued use of {APP_NAME} after changes 
                  take effect means you accept the updated terms.
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-2xl font-semibold text-white">Contact</h2>
                <p className="leading-relaxed">
                  If you have questions about these terms or {APP_NAME} in general, you can reach us at{' '}
                  <a 
                    href={`mailto:${APP_CONTACT_EMAIL}`}
                    className="text-white underline hover:text-white/80"
                  >
                    {APP_CONTACT_EMAIL}
                  </a>
                </p>
              </div>

              <div className="rounded-lg border border-white/20 bg-white/5 p-4">
                <p className="text-sm leading-relaxed text-white/80">
                  <strong className="text-white">Note:</strong> These terms are written in plain language 
                  to be clear and understandable. They are not a substitute for formal legal advice. 
                  {APP_NAME} is operated by an individual, not a registered company, and these terms 
                  reflect that context.
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
