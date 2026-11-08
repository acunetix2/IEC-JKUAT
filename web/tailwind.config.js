/** @type {import('tailwindcss').Config} */
// Ported verbatim from the brand config embedded in the old site's <head>.
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'iec-blue': '#18C8FF',
        'iec-gold': '#FBB03B',
        'iec-navy': '#00243d',
        'iec-dark': '#0a0a0a',
        'iec-green': '#006838',
        surface: '#f9f9fc',
        'on-surface': '#0a0a0a',
        muted: '#6b7280',
        // ── Ported token union from the other pages' inline Tailwind configs ──
        // The four colliding tokens (on-surface, on-surface-variant,
        // surface-container-low, outline-variant) keep their MAIN-page values
        // here; privacy/terms reproduce their own hexes via the .pp-scope block
        // in src/styles/index.css.
        'tech-blue': '#18C8FF',
        'jkuat-green': '#006838',
        'jkuat-gold': '#FBB03B',
        'on-surface-variant': '#6b7280',
        'surface-container-low': 'rgba(255,255,255,0.06)',
        'outline-variant': 'rgba(255,255,255,0.1)',
        secondary: '#825500',
        'on-secondary-fixed': '#291800',
        'glass-border': 'rgba(255,255,255,0.2)',
        'surface-gray': '#F4F7F9',
        'surface-container': '#eeeef0',
        'surface-container-highest': '#e2e2e5',
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        'headline-lg': ['Plus Jakarta Sans'],
        'headline-md': ['Plus Jakarta Sans'],
        'body-md': ['Inter'],
        'body-lg': ['Inter'],
        'label-md': ['Inter'],
      },
      fontSize: {
        hero: ['clamp(3rem, 8vw, 7rem)', { lineHeight: '1.0', letterSpacing: '-0.03em', fontWeight: '800' }],
        title: ['clamp(2rem, 4vw, 3.5rem)', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        lead: ['clamp(1rem, 1.5vw, 1.25rem)', { lineHeight: '1.6' }],
        'headline-lg': ['32px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '700' }],
        'headline-md': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'label-md': ['14px', { lineHeight: '1.2', letterSpacing: '0.05em', fontWeight: '600' }],
      },
      spacing: {
        'bento-gap': '1rem',
        'stack-lg': '2rem',
        'grid-margin': '2rem',
        'section-padding': '5rem',
      },
    },
  },
  plugins: [],
};
