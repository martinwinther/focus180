import Link from 'next/link';
import { APP_NAME } from '@/lib/config/appConfig';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-white/10 bg-white/5 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-white/60">
              © {currentYear} {APP_NAME}
            </p>
            
            <nav className="flex items-center gap-6" aria-label="Footer navigation">
              <Link 
                href="/about" 
                className="text-sm text-white/60 transition-colors hover:text-white/90"
              >
                About
              </Link>
              <Link 
                href="/privacy" 
                className="text-sm text-white/60 transition-colors hover:text-white/90"
              >
                Privacy
              </Link>
              <Link 
                href="/terms" 
                className="text-sm text-white/60 transition-colors hover:text-white/90"
              >
                Terms
              </Link>
              <Link 
                href="/contact" 
                className="text-sm text-white/60 transition-colors hover:text-white/90"
              >
                Contact
              </Link>
            </nav>
          </div>

          <div className="flex flex-col gap-6 border-t border-white/10 pt-6 sm:flex-row sm:justify-between">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
                Studio Projects
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                <a
                  href="https://lectiotoday.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white/60 transition-colors hover:text-white/90"
                >
                  Lectio Today
                </a>
                <a
                  href="https://dailysutra.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white/60 transition-colors hover:text-white/90"
                >
                  Daily Sutra
                </a>
                <a
                  href="https://www.asceticjourney.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white/60 transition-colors hover:text-white/90"
                >
                  Ascetic Journey
                </a>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
                Built by
              </p>
              <a
                href="https://calmplexity.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-white/60 transition-colors hover:text-white/90"
              >
                calmplexity.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

