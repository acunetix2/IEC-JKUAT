import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import SiteLayout from './components/SiteLayout';
import Home from './pages/Home';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Showcase from './pages/Showcase';
import ProjectDetail from './pages/ProjectDetail';
import Merchandise from './pages/Merchandise';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import NotFound from './pages/NotFound';

// Admin is the largest module and never needed on public routes.
const Admin = lazy(() => import('./pages/Admin'));

export default function App() {
  return (
    <Routes>
      {/* Main routes share the public chrome via the SiteLayout layout route */}
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/events" element={<Events />} />
        <Route path="/event" element={<EventDetail />} />
        <Route path="/showcase" element={<Showcase />} />
        <Route path="/project" element={<ProjectDetail />} />
        <Route path="/merchandise" element={<Merchandise />} />
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
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
