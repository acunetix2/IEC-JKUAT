// IEC JKUAT — scroll reveal hook.
// Ports animations.js sections 1-2 (reveal + split). Elements carrying
// [data-reveal] (and the [data-split] headings) animate in via an
// IntersectionObserver when they enter the viewport. Split headings are
// rendered as JSX spans by the calling page (see splitWords below) rather
// than by mutating innerHTML, so React owns the DOM.
//
// Call this from a page's component body; it runs in a useEffect so the scan
// happens after the route's markup mounts and re-scans on every route change.

import { useEffect, type CSSProperties } from 'react';

/**
 * splitWords(text)
 * Returns the per-word props a [data-split] heading renders as <span> children:
 *   {words.map(w => <span className="split-word" style={w.style}>{w.word}</span>)}
 * joined by spaces. Mirrors the i*0.07s stagger from the source.
 */
export function splitWords(text: string): { word: string; style: CSSProperties }[] {
  return text
    .trim()
    .split(/\s+/)
    .map((word, i) => ({ word, style: { transitionDelay: `${i * 0.07}s` } }));
}

export function useReveal(): void {
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const revealEls = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    const splitEls = Array.from(document.querySelectorAll<HTMLElement>('[data-split]'));

    // Reduced motion: reveal everything immediately, skip observer theatrics.
    if (reduceMotion) {
      revealEls.forEach((el) => el.classList.add('revealed'));
      splitEls.forEach((el) => el.classList.add('revealed'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    revealEls.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);
}
