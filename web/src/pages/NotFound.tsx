// IEC JKUAT — 404 page. Ported from site/404.html. Standalone (no shared
// chrome); the dark background comes from the global body styles in index.css.
// The .btn-primary / .btn-ghost / .social-icon classes are defined in
// index.css and shared across the app.

import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      {/* Big 404 */}
      <div
        className="font-display font-extrabold text-iec-blue select-none mb-2"
        style={{ fontSize: 'clamp(6rem, 20vw, 14rem)', lineHeight: 1, opacity: 0.15 }}
      >
        404
      </div>

      <div style={{ marginTop: '-2rem' }}>
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 mb-5 text-iec-blue text-xs font-bold uppercase tracking-widest"
          style={{ background: 'rgba(0,174,239,0.08)', border: '1px solid rgba(0,174,239,0.2)', borderRadius: '999px' }}
        >
          Page Not Found
        </div>
        <h1
          className="font-display font-bold text-white mb-3"
          style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', letterSpacing: '-0.02em' }}
        >
          This page wandered off.
        </h1>
        <p className="text-white/40 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <Link to="/" className="btn-primary">
            <span className="material-symbols-outlined text-[16px]">home</span> Back to Home
          </Link>
          <Link to="/events" className="btn-ghost">
            <span className="material-symbols-outlined text-[16px]">event</span> View Events
          </Link>
          <Link to="/contact" className="btn-ghost">
            <span className="material-symbols-outlined text-[16px]">mail</span> Contact Us
          </Link>
        </div>

        <div className="flex justify-center gap-3">
          <a
            href="https://twitter.com/iecjkuat"
            target="_blank"
            rel="noopener"
            className="social-icon"
            aria-label="Twitter"
          >
            <span className="material-symbols-outlined text-[18px]">alternate_email</span>
          </a>
          <a
            href="https://linkedin.com/company/iecjkuat"
            target="_blank"
            rel="noopener"
            className="social-icon"
            aria-label="LinkedIn"
          >
            <span className="material-symbols-outlined text-[18px]">work</span>
          </a>
          <a
            href="https://instagram.com/iecjkuat"
            target="_blank"
            rel="noopener"
            className="social-icon"
            aria-label="Instagram"
          >
            <span className="material-symbols-outlined text-[18px]">photo_camera</span>
          </a>
        </div>
      </div>
    </div>
  );
}
