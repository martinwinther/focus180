import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-white/10 bg-white/5 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-white/60">
            © {currentYear} Focus Ramp
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
          </nav>
        </div>
      </div>
    </footer>
  );
}

