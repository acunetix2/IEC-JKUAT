// IEC JKUAT — public layout route.
// Renders the shared chrome (Nav + MobileMenu + Footer) around the routed
// page via <Outlet>, owns the mobile-menu open state, and runs useNavScroll
// for the whole public shell. Closes the mobile menu on every route change.

import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Nav from './Nav';
import MobileMenu from './MobileMenu';
import Footer from './Footer';
import { useNavScroll } from '../hooks/useNavScroll';

export default function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useNavScroll();

  // Close the mobile menu and release the body scroll lock on navigation.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll while the mobile menu is open (mirrors toggleMobileMenu).
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <>
      <Nav onMenuOpen={() => setMenuOpen(true)} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <Outlet />
      <Footer />
    </>
  );
}
