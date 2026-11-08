// IEC JKUAT — top navigation.
// Ports the <nav id="nav"> markup from the source pages verbatim (classes,
// data-magnetic, structure), swapping <a> for react-router <Link> and wiring
// the theme toggle to the ThemeContext and the mobile button to an
// onMenuOpen callback. useNavScroll (owned by SiteLayout) toggles .scrolled.

import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function Nav({ onMenuOpen }: { onMenuOpen: () => void }) {
  const { theme, toggle } = useTheme();
  const isLight = theme === 'light';

  return (
    <nav id="nav">
      <div className="flex justify-between items-center px-6 md:px-16 py-5 max-w-screen-xl mx-auto">
        {/* Logo */}
        <Link to="/" className="font-display font-bold text-white text-lg tracking-tight">
          IEC <span className="text-iec-blue">JKUAT</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-10">
          <Link className="text-sm font-medium text-white/60 hover:text-white transition-colors" to="/">
            Home
          </Link>
          <Link className="text-sm font-medium text-white/60 hover:text-white transition-colors" to="/events">
            Events
          </Link>
          <Link className="text-sm font-medium text-white/60 hover:text-white transition-colors" to="/showcase">
            Projects
          </Link>
          <Link className="text-sm font-medium text-white/60 hover:text-white transition-colors" to="/contact">
            Contact
          </Link>
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/merchandise"
            className="hidden md:block text-sm font-medium text-white/50 hover:text-white transition-colors"
          >
            Merch
          </Link>
          <Link to="/#join" className="hidden sm:inline-flex btn-primary text-sm py-2 px-5" data-magnetic="0.3">
            Join IEC
          </Link>
          <button
            onClick={toggle}
            className="flex p-2 text-white/50 hover:text-white transition-colors"
            title="Toggle theme"
            aria-label="Toggle dark/light mode"
            style={{ lineHeight: 1 }}
          >
            <span className="material-symbols-outlined">{isLight ? 'light_mode' : 'dark_mode'}</span>
          </button>
          <button
            className="md:hidden p-2 text-white/60 hover:text-white transition-colors"
            onClick={onMenuOpen}
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
