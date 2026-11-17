import { useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiArrowRight, FiMenu, FiShoppingCart } from 'react-icons/fi';
import ClubLogo from './ClubLogo';
import { useCart } from '../context/CartContext';

const SECTIONS: Record<string, string[]> = {
  '/about': ['/about'],
  '/products': ['/products', '/merchandise'],
  '/events': ['/events', '/event'],
  '/showcase': ['/showcase', '/project'],
  '/blog': ['/blog'],
  '/contact': ['/contact'],
};

export default function Nav({ onMenuOpen }: { onMenuOpen: () => void }) {
  const { pathname } = useLocation();
  const { count } = useCart();
  const navLinksRef = useRef<HTMLDivElement>(null);
  const [indicatorX, setIndicatorX] = useState<number | null>(null);
  const [animateIndicator, setAnimateIndicator] = useState(false);
  const isProductPage = pathname === '/products' || pathname === '/merchandise' || pathname.startsWith('/products/');
  const isActive = (to: string) => to === '/products'
    ? isProductPage
    : SECTIONS[to]?.includes(pathname) ?? pathname === to;

  useLayoutEffect(() => {
    const navLinks = navLinksRef.current;
    if (!navLinks) return;

    const updateIndicator = () => {
      const activeLink = navLinks.querySelector<HTMLAnchorElement>('.active');
      if (activeLink) {
        setIndicatorX(activeLink.offsetLeft + activeLink.offsetWidth / 2 - 12);
      }
    };

    updateIndicator();
    const animationFrame = window.requestAnimationFrame(() => setAnimateIndicator(true));
    const resizeObserver = new ResizeObserver(updateIndicator);
    resizeObserver.observe(navLinks);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, [pathname]);

  return (
    <nav id="nav" className="site-nav">
      <div className="site-nav-inner">
        <Link to="/" className="site-brand" aria-label="IEC JKUAT home">
          <ClubLogo className="site-brand-mark" />
          <span className="site-brand-copy">
            <strong>IEC</strong>
            <small>Innovation and Entrepreneurship<br />Club • JKUAT</small>
          </span>
        </Link>

        <div className="site-nav-links" ref={navLinksRef}>
          <Link className={isActive('/') ? 'active' : ''} to="/">Home</Link>
          <Link className={isActive('/showcase') ? 'active' : ''} to="/showcase">Innovations</Link>
          <Link className={isActive('/about') ? 'active' : ''} to="/about">About</Link>
          <Link className={isActive('/products') ? 'active' : ''} to="/products">Products</Link>
          <Link className={isActive('/events') ? 'active' : ''} to="/events">Events</Link>
          <Link className={isActive('/blog') ? 'active' : ''} to="/blog">Blog</Link>
          <Link className={isActive('/contact') ? 'active' : ''} to="/contact">Contact us</Link>
          <span
            className={`site-nav-indicator${animateIndicator ? ' is-animated' : ''}`}
            aria-hidden="true"
            style={indicatorX === null ? undefined : { transform: `translateX(${indicatorX}px)` }}
          />
        </div>

        <div className="site-nav-actions">
          {isProductPage && (
            <Link
              to="/cart"
              className="site-nav-cart"
              data-cart-target
              aria-label={`View cart${count ? `, ${count} ${count === 1 ? 'item' : 'items'}` : ''}`}
            >
              <FiShoppingCart aria-hidden="true" />
              <span>Cart</span>
              {count > 0 && <span className="site-cart-count">{count}</span>}
            </Link>
          )}
          <Link to="/#join" className="site-nav-join">Get involved <FiArrowRight aria-hidden="true" /></Link>
          <button type="button" className="site-menu-toggle" onClick={onMenuOpen} aria-label="Open menu">
            <FiMenu aria-hidden="true" />
          </button>
        </div>
      </div>
    </nav>
  );
}
