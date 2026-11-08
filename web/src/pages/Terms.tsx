// IEC JKUAT — Terms of Service.
// Standalone chrome wrapped in .pp-scope (see Privacy). Content ported
// verbatim from site/terms.html.

import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function Terms() {
  const { theme, toggle } = useTheme();
  return (
    <div className="pp-scope bg-surface text-on-surface font-body-md min-h-screen">
      <nav className="fixed top-0 w-full z-50 bg-surface/70 backdrop-blur-xl border-b border-glass-border shadow-sm">
        <div className="flex justify-between items-center px-grid-margin py-4 max-w-7xl mx-auto">
          <Link to="/" className="text-headline-md font-bold text-jkuat-green">
            IEC JKUAT
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={toggle}
              className="p-2 text-on-surface-variant hover:text-tech-blue transition-colors"
              title="Toggle dark mode"
              aria-label="Toggle theme"
            >
              <span className="material-symbols-outlined">{theme === 'light' ? 'dark_mode' : 'light_mode'}</span>
            </button>
            <Link to="/" className="font-label-md text-label-md text-tech-blue hover:underline">
              &larr; Back to Home
            </Link>
          </div>
        </div>
      </nav>
      <main className="pt-32 pb-section-padding px-grid-margin max-w-4xl mx-auto">
        <h1 className="font-headline-lg text-headline-lg mb-8">Terms of Service</h1>
        <div className="prose max-w-none font-body-md text-body-md text-on-surface-variant space-y-6">
          <p>
            <strong>Last updated:</strong> June 2026
          </p>
          <h2 className="font-headline-md text-headline-md text-on-surface mt-10 mb-4">1. Membership</h2>
          <p>
            Membership in IEC JKUAT is open to all registered JKUAT students. By registering, you agree to provide
            accurate information and pay the semester membership fee of KES 200. Membership is valid for one semester
            and may be renewed.
          </p>
          <h2 className="font-headline-md text-headline-md text-on-surface mt-10 mb-4">2. Code of Conduct</h2>
          <p>
            Members are expected to maintain professional and respectful conduct at all club events, workshops, and
            online platforms. Harassment, discrimination, or disruptive behavior will result in membership revocation.
          </p>
          <h2 className="font-headline-md text-headline-md text-on-surface mt-10 mb-4">3. Merchandise</h2>
          <p>
            All merchandise sales are final. Orders are processed within 24 hours and delivered to JKUAT Main Campus.
            Member-exclusive items require active membership status.
          </p>
          <h2 className="font-headline-md text-headline-md text-on-surface mt-10 mb-4">4. Payments</h2>
          <p>
            All payments are processed via M-Pesa through lipana.dev. Your payment information is handled securely and
            is not stored on our servers.
          </p>
          <h2 className="font-headline-md text-headline-md text-on-surface mt-10 mb-4">5. Limitation of Liability</h2>
          <p>
            IEC JKUAT is not liable for any indirect, incidental, or consequential damages arising from your
            participation in club activities or use of our services.
          </p>
          <h2 className="font-headline-md text-headline-md text-on-surface mt-10 mb-4">6. Contact</h2>
          <p>
            For questions about these terms, contact us at info@iecjkuat.com or visit the Student Center, Room 201 at
            JKUAT Main Campus.
          </p>
        </div>
      </main>
      <footer className="border-t border-outline-variant/30 py-section-padding text-center">
        <p className="text-on-surface-variant/60 font-body-md text-body-md">
          &copy; 2026 IEC JKUAT — Innovation &amp; Entrepreneurship Club.
        </p>
      </footer>
    </div>
  );
}
