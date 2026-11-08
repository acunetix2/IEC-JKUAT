// IEC JKUAT — Events list. Ported from events.html + events.js.
// Fetches events via getEvents(), renders alternating image/content cards
// (image left/right by index), supports track filters, and shows a community
// gallery built from all event media (hidden when there are no photos).

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEvents } from '../lib/supabase';
import { parseMediaUrls, isPreviewImage, EVENT_FALLBACK_IMG } from '../lib/media';
import type { EventRow } from '../types/db';

const FILTERS = [
  { track: 'all', label: 'All Tracks' },
  { track: 'fintech', label: 'Fintech' },
  { track: 'agtech', label: 'AgTech' },
  { track: 'edtech', label: 'EdTech' },
  { track: 'leadership', label: 'Leadership' },
  { track: 'networking', label: 'Networking' },
];

const TRACK_ACCENT: Record<string, string> = {
  fintech: '#18C8FF',
  agtech: '#22c55e',
  hackathon: '#18C8FF',
  featured: '#18C8FF',
  leadership: '#FBB03B',
  networking: '#ef4444',
  workshop: '#22c55e',
};

function trackKey(category?: string): string {
  return (category || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export default function Events() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let active = true;
    getEvents()
      .then((data) => {
        if (active) setEvents(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load events');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(
    () => (filter === 'all' ? events : events.filter((e) => trackKey(e.track ?? (e as { category?: string }).category) === filter)),
    [events, filter]
  );

  const galleryImages = useMemo(() => {
    const imgs: string[] = [];
    events.forEach((e) => {
      parseMediaUrls(e.media_urls)
        .filter((u) => isPreviewImage(u))
        .forEach((img) => imgs.push(img));
    });
    return imgs.slice(0, 8);
  }, [events]);

  return (
    <main style={{ paddingTop: '72px' }}>
      {/* Header + filters */}
      <section className="px-6 md:px-16 max-w-screen-xl mx-auto pt-10 pb-8 md:pt-14 md:pb-10 text-center">
        <p className="section-label mb-4">What's Happening</p>
        <h1
          className="font-display font-extrabold text-white mb-4"
          style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', lineHeight: 1.05, letterSpacing: '-0.03em' }}
        >
          Events &amp; Programs
        </h1>
        <p className="text-white/60 text-base max-w-xl mx-auto leading-relaxed mb-6">
          Hackathons, workshops, pitch nights and founder sessions. Stay connected with what's happening inside IEC
          JKUAT.
        </p>
        <p className="text-white/30 text-xs mb-4">{filtered.length} events</p>
        <div className="flex flex-wrap justify-center gap-2" id="event-filters" role="group" aria-label="Filter events by track">
          {FILTERS.map((f) => (
            <button
              key={f.track}
              className={`filter-btn-events ${filter === f.track ? 'active-filter' : ''}`}
              aria-pressed={filter === f.track}
              onClick={() => setFilter(f.track)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {/* Event list */}
      <section className="px-6 md:px-16 max-w-screen-xl mx-auto mb-20">
        <hr className="section-divider" style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.07)', marginBottom: '2rem' }} />
        <div className="space-y-4">
          {loading ? (
            <div className="py-16 text-center text-white/30">
              <span className="material-symbols-outlined animate-spin inline-block text-3xl mb-3">sync</span>
              <p className="text-sm">Loading events...</p>
            </div>
          ) : error ? (
            <p className="text-red-500 py-16 text-center">Failed to load events: {error}</p>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>
              <span className="material-symbols-outlined text-4xl mb-4 block">event_busy</span>
              <p className="text-sm">No events scheduled yet. Check back soon.</p>
            </div>
          ) : (
            filtered.map((event, index) => <EventCard key={event.id} event={event} index={index} />)
          )}
        </div>
      </section>

      {/* Community gallery — only when there are photos */}
      {galleryImages.length > 0 && (
        <section className="py-20 px-6 md:px-16 max-w-screen-xl mx-auto">
          <div className="mb-12">
            <p className="section-label mb-4">Community</p>
            <h2 className="font-display font-bold text-white" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)' }}>
              In action
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {galleryImages.map((img, i) => {
              const offset = i % 2 === 1 ? 'md:mt-12' : '';
              return (
                <div
                  key={i}
                  className={`aspect-square overflow-hidden ${i < 2 ? '' : offset}`}
                  style={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}
                >
                  <img
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    src={img}
                    alt={`Event photo ${i + 1}`}
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}

function EventCard({ event, index }: { event: EventRow; index: number }) {
  const category = (event as { category?: string }).category || event.track;
  const date = event.event_date ? new Date(event.event_date) : null;
  const validDate = date && !isNaN(date.getTime());
  const day = validDate ? date!.getDate() : '—';
  const month = validDate ? date!.toLocaleString('en', { month: 'short' }).toUpperCase() : '';
  const year = validDate ? date!.getFullYear() : '';
  const isPast = Boolean(validDate && date! < new Date());
  const track = trackKey(category);
  const imageRight = index % 2 !== 0;

  const mediaUrls = parseMediaUrls(event.media_urls);
  const previewImg = mediaUrls.find((u) => isPreviewImage(u)) || EVENT_FALLBACK_IMG;
  const accentColor = TRACK_ACCENT[track] || '#18C8FF';
  const categoryLabel = category || 'Event';

  const imageHalf = (
    <div className={`w-full md:w-1/2 relative ${imageRight ? 'md:order-2' : 'md:order-1'}`} style={{ minHeight: '280px' }}>
      <img
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        src={previewImg}
        alt={event.title}
        loading="lazy"
        style={isPast ? { filter: 'grayscale(35%)', opacity: 0.8 } : undefined}
      />
      <div className="absolute top-3 left-3 md:top-5 md:left-5 flex gap-2">
        <span
          className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 md:px-3 md:py-1.5"
          style={{ background: accentColor, color: '#000', borderRadius: '6px' }}
        >
          {categoryLabel}
        </span>
        {isPast ? (
          <span
            className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 md:px-3 md:py-1.5"
            style={{ color: '#ffffff', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', borderRadius: '6px' }}
          >
            Past
          </span>
        ) : (
          <span
            className="text-[10px] md:text-[11px] font-bold px-2.5 py-1 md:px-3 md:py-1.5"
            style={{
              color: '#ffffff',
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '6px',
            }}
          >
            {day} {month} {year}
          </span>
        )}
      </div>
    </div>
  );

  const contentHalf = (
    <div
      className={`w-full md:w-1/2 p-5 sm:p-8 md:p-12 flex flex-col justify-center ${imageRight ? 'md:order-1' : 'md:order-2'}`}
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      <p className="section-label mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          bolt
        </span>
        {categoryLabel}
      </p>
      <h2 className="event-title font-display font-bold mb-4" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', lineHeight: 1.1 }}>
        {event.title}
      </h2>
      <p className="event-desc text-sm leading-relaxed mb-5 max-w-md line-clamp-3 sm:line-clamp-4">{event.description}</p>
      {event.location && (
        <p className="flex items-center gap-1.5 text-white/50 text-xs mb-5">
          <span className="material-symbols-outlined text-[14px]">location_on</span>
          {event.location}
        </p>
      )}
      <div className="flex flex-wrap gap-3 justify-center">
        <span className="btn-primary text-sm py-2.5">
          View Details <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </span>
      </div>
    </div>
  );

  return (
    <Link
      to={`/event?id=${event.id}`}
      className="event-card group relative overflow-hidden flex flex-col md:flex-row"
      data-track={track}
      aria-label={`View details for ${event.title}`}
      style={{
        minHeight: '320px',
        display: 'flex',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '8px',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      {imageHalf}
      {contentHalf}
    </Link>
  );
}
