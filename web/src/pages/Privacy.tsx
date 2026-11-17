// IEC JKUAT — Privacy Policy.
// Standalone chrome (own nav/footer, divergent token system) wrapped in
// .pp-scope so the privacy/terms light palette applies without affecting the
// main pages. Content ported verbatim from site/privacy.html.

import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="pp-scope bg-surface text-on-surface font-body-md min-h-screen">
      <nav className="fixed top-0 w-full z-50 bg-surface/70 backdrop-blur-xl border-b border-glass-border shadow-sm">
        <div className="flex justify-between items-center px-grid-margin py-4 max-w-7xl mx-auto">
          <Link to="/" className="text-headline-md font-bold text-jkuat-green">
            IEC JKUAT
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="font-label-md text-label-md text-tech-blue hover:underline">
              &larr; Back to Home
            </Link>
          </div>
        </div>
      </nav>
      <main className="pt-32 pb-section-padding px-grid-margin max-w-4xl mx-auto">
        <h1 className="font-headline-lg text-headline-lg mb-8">Privacy Policy</h1>
        <div className="prose max-w-none font-body-md text-body-md text-on-surface-variant space-y-6">
          <p>
            <strong>Last updated:</strong> June 2026
          </p>
          <h2 className="font-headline-md text-headline-md text-on-surface mt-10 mb-4">1. Information We Collect</h2>
          <p>
            When you register for IEC JKUAT membership, we collect: your full name, student registration number,
            college, course, year of study, phone number, and JKUAT student email address. When you subscribe to our
            newsletter, we collect your email address.
          </p>
          <h2 className="font-headline-md text-headline-md text-on-surface mt-10 mb-4">2. How We Use Your Information</h2>
          <p>
            We use your information to: process your membership registration, communicate about club events and
            activities, send newsletters (if subscribed), and improve our programs. We do not share your personal data
            with third parties except as necessary for payment processing via M-Pesa.
          </p>
          <h2 className="font-headline-md text-headline-md text-on-surface mt-10 mb-4">3. Data Storage</h2>
          <p>
            Your data is stored securely in our Supabase database. We implement industry-standard security measures to
            protect your personal information.
          </p>
          <h2 className="font-headline-md text-headline-md text-on-surface mt-10 mb-4">4. Your Rights</h2>
          <p>
            You may request access to, correction of, or deletion of your personal data at any time by contacting us at
            info@iecjkuat.com.
          </p>
          <h2 className="font-headline-md text-headline-md text-on-surface mt-10 mb-4">5. Contact</h2>
          <p>
            For privacy-related inquiries, reach us at: JKUAT Main Campus, Student Center Room 201, or email
            info@iecjkuat.com.
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
