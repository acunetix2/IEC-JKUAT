// IEC JKUAT — top navigation.
// Ports the <nav id="nav"> markup from the source pages verbatim (classes,
// data-magnetic, structure), swapping <a> for react-router <Link> and wiring
// the theme toggle to the ThemeContext and the mobile button to an
// onMenuOpen callback. useNavScroll (owned by SiteLayout) toggles .scrolled.

import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';

// Same two link styles the old pages hard-coded: the current section was
// blue with an underline, the rest white/60. Detail pages light up their
// list page (event.html lit "Events", project.html lit "Projects"). Home
// was never highlighted on index.html, so it is not here either.
const LINK = 'text-sm font-medium text-white/60 hover:text-white transition-colors';
const ACTIVE = 'text-sm font-medium text-iec-blue border-b border-iec-blue pb-0.5';
const SECTIONS: Record<string, string[]> = {
  '/events': ['/events', '/event'],
  '/showcase': ['/showcase', '/project'],
  '/contact': ['/contact'],
};

export default function Nav({ onMenuOpen }: { onMenuOpen: () => void }) {
  const { theme, toggle } = useTheme();
  const isLight = theme === 'light';
  const { pathname } = useLocation();
  const { count, setCartOpen } = useCart();
  const onMerch = pathname === '/merchandise';
  const cls = (to: string) => (SECTIONS[to]?.includes(pathname) ? ACTIVE : LINK);

  return (
    <nav id="nav">
      <div className="flex justify-between items-center px-6 md:px-16 py-5 max-w-screen-xl mx-auto">
        {/* Logo */}
        <Link to="/" className="font-display font-bold text-white text-lg tracking-tight">
          IEC <span className="text-iec-blue">JKUAT</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-10">
          <Link className={LINK} to="/">
            Home
          </Link>
          <Link className={cls('/events')} to="/events">
            Events
          </Link>
          <Link className={cls('/showcase')} to="/showcase">
            Projects
          </Link>
          <Link className={cls('/contact')} to="/contact">
            Contact
          </Link>
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onMerch ? (
            // merchandise.html's nav: plain "Join IEC" link + Bag button with a count badge
            <>
              <Link to="/#join" className="hidden md:block text-sm font-medium text-white/50 hover:text-white transition-colors">
                Join IEC
              </Link>
              <button
                onClick={() => setCartOpen(true)}
                className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-white/70 hover:text-white transition-colors relative px-4 py-2"
                style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px' }}
                aria-label="Open shopping bag"
              >
                <span className="material-symbols-outlined text-[18px]">shopping_bag</span> Bag
                {count > 0 && (
                  <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {count}
                  </span>
                )}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/merchandise"
                className="hidden md:block text-sm font-medium text-white/50 hover:text-white transition-colors"
              >
                Merch
              </Link>
              <Link to="/#join" className="hidden sm:inline-flex btn-primary text-sm py-2 px-5" data-magnetic="0.3">
                Join IEC
              </Link>
            </>
          )}
          <button
            onClick={toggle}
            className="flex p-2 text-white/50 hover:text-white transition-colors"
            title="Toggle theme"
            aria-label="Toggle dark/light mode"
            style={{ lineHeight: 1 }}
          >
            {/* Old pages showed the mode you switch TO: moon in light, sun in dark */}
            <span className="material-symbols-outlined">{isLight ? 'dark_mode' : 'light_mode'}</span>
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
