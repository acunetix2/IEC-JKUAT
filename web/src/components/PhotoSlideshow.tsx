import { useEffect, useState } from 'react';

export default function PhotoSlideshow({ images }: { images: string[] }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    preference.addEventListener('change', updatePreference);
    return () => preference.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    if (reducedMotion || images.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % images.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [images.length, reducedMotion]);

  return (
    <div className="home-hero-backdrop" aria-hidden="true">
      {images.map((src, index) => (
        <img
          key={src}
          className={index === activeSlide ? 'is-active' : ''}
          src={src}
          alt=""
          loading={index === 0 ? 'eager' : 'lazy'}
          decoding="async"
        />
      ))}
    </div>
  );
}
