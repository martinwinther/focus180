import { PublicHeader } from '@/components/PublicHeader';
import { Footer } from '@/components/Footer';
import { APP_NAME, APP_CONTACT_EMAIL } from '@/lib/config/appConfig';

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      <main className="flex-1 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="glass-card">
            <h1 className="mb-8 text-4xl font-bold text-white md:text-5xl">
              Contact
            </h1>

            <div className="space-y-8 text-white/90">
              <div>
                <h2 className="mb-3 text-2xl font-semibold text-white">Get in touch</h2>
                <p className="leading-relaxed">
                  Have a question, suggestion, or need help with {APP_NAME}? We&apos;d love to hear from you.
                </p>
              </div>

              <div className="rounded-xl bg-white/5 p-6">
                <h3 className="mb-3 text-xl font-semibold text-white">Email</h3>
                <p className="mb-4 leading-relaxed text-white/80">
                  The best way to reach us is via email:
                </p>
                <a
                  href={`mailto:${APP_CONTACT_EMAIL}`}
                  className="inline-block rounded-lg bg-primary/20 px-6 py-3 text-lg font-medium text-white transition-colors hover:bg-primary/30"
                >
                  {APP_CONTACT_EMAIL}
                </a>
              </div>

              <div>
                <h3 className="mb-3 text-xl font-semibold text-white">What to include</h3>
                <p className="mb-3 leading-relaxed">
                  To help us respond quickly, please include:
                </p>
                <ul className="space-y-2 pl-6">
                  <li className="list-disc">A brief description of your question or issue</li>
                  <li className="list-disc">Your account email (if it&apos;s account-related)</li>
                  <li className="list-disc">Any relevant details or screenshots</li>
                </ul>
              </div>

              <div>
                <h3 className="mb-3 text-xl font-semibold text-white">Response time</h3>
                <p className="leading-relaxed">
                  We aim to respond to all emails within 48 hours. For urgent issues, we&apos;ll do our best 
                  to get back to you sooner.
                </p>
              </div>

              <div className="rounded-lg border border-white/20 bg-white/5 p-4">
                <p className="text-sm leading-relaxed text-white/80">
                  <strong className="text-white">Note:</strong> {APP_NAME} is currently operated by an individual. 
                  We appreciate your patience as we work to provide the best experience possible.
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

