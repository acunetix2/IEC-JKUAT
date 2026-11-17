// IEC JKUAT — mobile slide-in menu.
// Ports the MOBILE_MENU_HTML from supabase-config.js. Styled via the
// #mobile-menu / #mobile-overlay CSS in index.css (NOT theme tokens), so the
// class names and ids are preserved verbatim. Open state is owned by
// SiteLayout; closing is delegated via onClose.

import { Link } from 'react-router-dom';
import { FiArrowRight, FiBookOpen, FiCalendar, FiHome, FiInfo, FiLayers, FiMail, FiPackage, FiX } from 'react-icons/fi';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileMenu({ open, onClose }: MobileMenuProps) {
  return (
    <>
      <div
        id="mobile-overlay"
        className={`fixed inset-0 bg-black/40 z-40 md:hidden ${open ? '' : 'hidden'}`}
        onClick={onClose}
      />
      <div
        id="mobile-menu"
        className={`fixed top-0 right-0 h-full w-72 z-50 shadow-2xl transition-transform duration-300 ease-in-out md:hidden flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="menu-head flex justify-between items-center p-6">
          <span className="font-display font-bold menu-brand">
            IEC <span>JKUAT</span>
          </span>
          <button type="button" onClick={onClose} className="menu-close p-2" aria-label="Close menu">
            <FiX aria-hidden="true" />
          </button>
        </div>
        <nav className="p-6 flex flex-col gap-1 flex-1 overflow-y-auto">
          <Link to="/" onClick={onClose}>
            <FiHome aria-hidden="true" />
            Home
          </Link>
          <Link to="/showcase" onClick={onClose}>
            <FiLayers aria-hidden="true" />
            Innovations
          </Link>
          <Link to="/about" onClick={onClose}>
            <FiInfo aria-hidden="true" />
            About
          </Link>
          <Link to="/products" onClick={onClose}>
            <FiPackage aria-hidden="true" />
            Products
          </Link>
          <Link to="/events" onClick={onClose}>
            <FiCalendar aria-hidden="true" />
            Events
          </Link>
          <Link to="/blog" onClick={onClose}>
            <FiBookOpen aria-hidden="true" />
            Blog
          </Link>
          <Link to="/contact" onClick={onClose}>
            <FiMail aria-hidden="true" />
            Contact us
          </Link>
        </nav>
        <div className="menu-foot p-6">
          <Link to="/#join" onClick={onClose} className="menu-join">
            Join the club <FiArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </>
  );
}
