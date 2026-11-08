// IEC JKUAT — nav scroll hook.
// Toggles the #nav 'scrolled' class once the page is scrolled past 40px, via a
// passive scroll listener. Mirrors the inline script in the source pages.
// Owned by SiteLayout so the listener lives for the whole public shell.

import { useEffect } from 'react';

export function useNavScroll(): void {
  useEffect(() => {
    const nav = document.getElementById('nav');
    if (!nav) return;

    const onScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    };

    // Reflect the current position immediately (e.g. on a deep-linked load).
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => window.removeEventListener('scroll', onScroll);
  }, []);
}
