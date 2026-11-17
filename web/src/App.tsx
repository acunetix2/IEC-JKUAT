import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import SiteLayout from './components/SiteLayout';
import ScrollManager from './components/ScrollManager';
import { usePageMeta } from './hooks/usePageMeta';
import Home from './pages/Home';
import Activities from './pages/Activities';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Showcase from './pages/Showcase';
import Blog from './pages/Blog';
import ProjectDetail from './pages/ProjectDetail';
import Merchandise from './pages/Merchandise';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Contact from './pages/Contact';
import About from './pages/About';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import NotFound from './pages/NotFound';

// Admin is the largest module and never needed on public routes.
const Admin = lazy(() => import('./pages/Admin'));

// Old static-site URLs (events.html, event.html?id=..., index.html#join)
// are still in WhatsApp messages and bookmarks. Send them to the matching
// route, keeping the query string and hash; anything else is a real 404.
const LEGACY_PAGES = new Set(['index', 'about', 'events', 'event', 'showcase', 'project', 'blog', 'products', 'merchandise', 'contact', 'privacy', 'terms', 'admin']);

function NotFoundOrLegacy() {
  const { pathname, search, hash } = useLocation();
  const m = /^\/([a-z]+)\.html$/.exec(pathname);
  if (m && LEGACY_PAGES.has(m[1])) {
    const to = m[1] === 'index' ? '/' : `/${m[1]}`;
    return <Navigate to={`${to}${search}${hash}`} replace />;
  }
  return <NotFound />;
}

export default function App() {
  usePageMeta();
  return (
    <>
    <ScrollManager />
    <Routes>
      {/* Main routes share the public chrome via the SiteLayout layout route */}
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/activities" element={<Activities />} />
        <Route path="/about" element={<About />} />
        <Route path="/events" element={<Events />} />
        <Route path="/event" element={<EventDetail />} />
        <Route path="/showcase" element={<Showcase />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/project" element={<ProjectDetail />} />
        <Route path="/products" element={<Merchandise />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/merchandise" element={<Merchandise />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/contact" element={<Contact />} />
      </Route>

      {/* Admin — own full-screen chrome, lazy-loaded outside the layout */}
      <Route
        path="/admin"
        element={
          <Suspense fallback={null}>
            <Admin />
          </Suspense>
        }
      />

      {/* Standalone routes */}
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="*" element={<NotFoundOrLegacy />} />
    </Routes>
    </>
  );
}
