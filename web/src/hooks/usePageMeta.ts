// IEC JKUAT — per-route page identity.
// Each old HTML page had its own <title>, description, canonical link and
// loaded only its own <style>. This hook sets document.title, the
// description and canonical tags, and html[data-page], which index.css uses
// to scope page-only rules (see "PAGE SCOPING" at the top of index.css).
// Detail pages overwrite the title again once their record loads.
//
// Link previews (WhatsApp, Facebook) do not run JavaScript, so they always
// show the static Open Graph tags in index.html. Google renders JS and sees
// the per-route values set here.

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface PageMeta {
  page: string;
  title: string;
  description?: string;
  canonical?: boolean;
  noindex?: boolean;
}

const DEFAULT_DESCRIPTION =
  'IEC JKUAT is a student community at JKUAT for innovation, entrepreneurship and leadership. Join us to build, compete, connect and lead.';

const PAGES: Record<string, PageMeta> = {
  '/': { page: 'home', title: 'IEC JKUAT — Innovation & Entrepreneurship Club', description: DEFAULT_DESCRIPTION, canonical: true },
  '/about': {
    page: 'about',
    title: 'About IEC JKUAT | Our People and Purpose',
    description: 'Meet the students and advisors guiding IEC JKUAT and learn how the club helps ideas grow into practical projects.',
    canonical: true,
  },
  '/activities': {
    page: 'activities',
    title: 'Activities | IEC JKUAT',
    description: 'Explore IEC JKUAT workshops, projects and community experiences for students who want to learn by building.',
    canonical: true,
  },
  '/events': {
    page: 'events',
    title: 'Events | IEC JKUAT',
    description: 'Explore IEC JKUAT events — hackathons, pitch nights, workshops, and innovation tracks.',
    canonical: true,
  },
  '/event': { page: 'event', title: 'Event | IEC JKUAT' },
  '/showcase': {
    page: 'showcase',
    title: 'Innovations | IEC JKUAT',
    description: "Explore IEC JKUAT's innovation showcase — student projects, prototypes and ventures from JKUAT.",
    canonical: true,
  },
  '/blog': {
    page: 'blog',
    title: 'Blog | IEC JKUAT',
    description: 'Stories, ideas and lessons from the IEC JKUAT innovation community.',
    canonical: true,
  },
  '/project': { page: 'project', title: 'Project | IEC JKUAT' },
  '/products': {
    page: 'merch',
    title: 'Products | IEC JKUAT',
    description: 'Browse products from IEC JKUAT and shop available club merchandise.',
    canonical: true,
  },
  '/products/:id': {
    page: 'product',
    title: 'Product details | IEC JKUAT',
    description: 'View product details and available sizes from the IEC JKUAT merchandise collection.',
    canonical: true,
  },
  '/cart': {
    page: 'cart',
    title: 'Your Cart | IEC JKUAT',
    description: 'Review your IEC JKUAT merchandise cart and place an order.',
    noindex: true,
  },
  '/merchandise': {
    page: 'merch',
    title: 'Products | IEC JKUAT',
    description: 'IEC JKUAT merchandise — exclusive club gear, apparel, and accessories for student founders and innovators.',
    canonical: false,
  },
  '/contact': {
    page: 'contact',
    title: 'Contact | IEC JKUAT',
    description: 'Get in touch with IEC JKUAT — Innovation & Entrepreneurship Club at JKUAT.',
    canonical: true,
  },
  '/privacy': {
    page: 'privacy',
    title: 'Privacy Policy | IEC JKUAT',
    description: 'Privacy Policy for IEC JKUAT — Innovation & Entrepreneurship Club at JKUAT.',
    canonical: true,
  },
  '/terms': {
    page: 'terms',
    title: 'Terms of Service | IEC JKUAT',
    description: 'Terms of Service for IEC JKUAT — Innovation & Entrepreneurship Club.',
    canonical: true,
  },
  '/admin': { page: 'admin', title: 'Admin | IEC JKUAT', noindex: true },
};
const NOT_FOUND: PageMeta = { page: '404', title: 'Page Not Found | IEC JKUAT', noindex: true };

function upsert(selector: string, create: () => HTMLElement): HTMLElement {
  return document.head.querySelector<HTMLElement>(selector) ?? document.head.appendChild(create());
}

export function usePageMeta(): void {
  const { pathname } = useLocation();
  useEffect(() => {
    const meta = PAGES[pathname] ?? (pathname.startsWith('/products/') ? PAGES['/products/:id'] : NOT_FOUND);
    document.documentElement.dataset.page = meta.page;
    document.title = meta.title;

    const desc = upsert('meta[name="description"]', () => Object.assign(document.createElement('meta'), { name: 'description' }));
    desc.setAttribute('content', meta.description ?? DEFAULT_DESCRIPTION);

    const existingCanonical = document.head.querySelector('link[rel="canonical"]');
    if (meta.canonical) {
      const link = upsert('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }));
      link.setAttribute('href', `https://iecjkuat.com${pathname}`);
    } else {
      existingCanonical?.remove();
    }

    const robots = document.head.querySelector('meta[name="robots"]');
    if (meta.noindex) {
      upsert('meta[name="robots"]', () => Object.assign(document.createElement('meta'), { name: 'robots' })).setAttribute('content', 'noindex,nofollow');
    } else {
      robots?.remove();
    }
  }, [pathname]);
}
