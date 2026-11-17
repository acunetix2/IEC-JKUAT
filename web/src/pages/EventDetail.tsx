// IEC JKUAT — Event detail. Ported from event.html.
// Reads ?id, fetches the single event, and renders the hero gallery (with
// prev/next, dots, thumbnails), videos, embeds (via EmbedList), an expandable
// description, and the meta sidebar. Rendered inside the shared SiteLayout.

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { EVENT_FALLBACK_IMG, parseJsonList as parseMedia, isPreviewImage as isImg, isVideoMedia as isVid } from '../lib/media';
import { parseEmbedUrls } from '../lib/embeds';
import EmbedList from '../components/EmbedList';
import type { EventRow } from '../types/db';

const ACCENTS: Record<string, string> = {
  fintech: '#18C8FF',
  agtech: '#22c55e',
  hackathon: '#18C8FF',
  featured: '#18C8FF',
  leadership: '#FBB03B',
  networking: '#ef4444',
  workshop: '#22c55e',
};

export default function EventDetail() {
  const [params] = useSearchParams();
  const id = params.get('id');
  const [event, setEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setError('No event ID provided.');
      setLoading(false);
      return;
    }
    let active = true;
    supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error: err }) => {
        if (!active) return;
        if (err || !data) setError('Event not found');
        else {
          setEvent(data as EventRow);
          document.title = `${(data as EventRow).title} | IEC JKUAT`;
        }
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <>
      <div className="px-6 md:px-16 max-w-screen-xl mx-auto" style={{ paddingTop: '88px', paddingBottom: 0 }}>
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 text-sm font-medium hover:opacity-70 transition-opacity"
          style={{ color: 'rgba(255,255,255,0.45)' }}
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> All Events
        </Link>
      </div>

      <main className="px-6 md:px-16 max-w-screen-xl mx-auto py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <span className="material-symbols-outlined animate-spin mr-3">sync</span> Loading event…
          </div>
        ) : error || !event ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-5xl mb-4 block text-red-400">error</span>
            <p className="text-white/50 text-sm">{error || 'Event not found'}</p>
            <Link to="/events" className="inline-block mt-6 text-sm text-iec-blue hover:underline">
              ← Back to Events
            </Link>
          </div>
        ) : (
          <EventBody event={event} />
        )}
      </main>
    </>
  );
}

function EventBody({ event }: { event: EventRow }) {
  const category = event.category || 'Event';
  const media = useMemo(() => parseMedia(event.media_urls), [event.media_urls]);
  const images = useMemo(() => {
    const imgs = media.filter(isImg);
    return imgs.length ? imgs : [EVENT_FALLBACK_IMG];
  }, [media]);
  const videos = useMemo(() => media.filter(isVid), [media]);
  const embeds = useMemo(() => parseEmbedUrls(event.embed_urls), [event.embed_urls]);

  const [galIdx, setGalIdx] = useState(0);
  const [descOpen, setDescOpen] = useState(false);
  const longDesc = (event.description || '').length > 400;

  const dateStr = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';
  const accent = ACCENTS[category.toLowerCase()] || '#18C8FF';
  const total = images.length;
  const goto = (i: number) => setGalIdx(((i % total) + total) % total);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left: main content */}
      <div className="lg:col-span-2">
        {/* Hero gallery */}
        <div className="detail-gallery photo-overlay-container relative overflow-hidden rounded-xl mb-8" style={{ height: 'clamp(260px,40vw,480px)', background: '#000' }}>
          {images.map((img, i) => (
            <img
              key={i}
              src={img}
              alt={event.title}
              className={`gallery-img${i === galIdx ? ' is-active' : ''}`}
              style={{ opacity: i === galIdx ? 1 : 0 }}
              loading={i === 0 ? undefined : 'lazy'}
            />
          ))}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top,rgba(7,16,26,0.7) 0%,transparent 50%)', pointerEvents: 'none' }}
          />
          <div className="photo-reveal"><strong>{event.title}</strong><span>{event.category || 'IEC JKUAT event'}</span></div>
          {total > 1 && (
            <>
              <button
                onClick={() => goto(galIdx - 1)}
                aria-label="Previous image"
                className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center hover:opacity-80"
                style={{ background: 'rgba(0,0,0,0.55)' }}
              >
                <span className="material-symbols-outlined text-white text-[20px]">chevron_left</span>
              </button>
              <button
                onClick={() => goto(galIdx + 1)}
                aria-label="Next image"
                className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center hover:opacity-80"
                style={{ background: 'rgba(0,0,0,0.55)' }}
              >
                <span className="material-symbols-outlined text-white text-[20px]">chevron_right</span>
              </button>
              <div
                className="absolute top-4 right-4 text-xs font-semibold text-white px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(0,0,0,0.55)' }}
              >
                {galIdx + 1} / {total}
              </div>
              {total <= 8 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goto(i)}
                      aria-label={`Go to image ${i + 1}`}
                      className="w-2 h-2 rounded-full transition-all"
                      style={{ background: i === galIdx ? '#fff' : 'rgba(255,255,255,0.35)' }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        {total > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-8" style={{ scrollbarWidth: 'none' }}>
            {images.map((img, i) => (
              <img
                key={i}
                src={img}
                onClick={() => goto(i)}
                loading="lazy"
                className="flex-shrink-0 rounded cursor-pointer transition-all"
                style={{
                  width: '84px',
                  height: '60px',
                  objectFit: 'cover',
                  opacity: i === galIdx ? 1 : 0.4,
                  border: `2px solid ${i === galIdx ? '#18C8FF' : 'transparent'}`,
                }}
              />
            ))}
          </div>
        )}

        <p className="section-label mb-3">{category}</p>
        <h1 className="font-display font-extrabold text-white mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem,4vw,3rem)' }}>
          {event.title}
        </h1>
        <div className="mb-8">
          <p
            id="ev-desc"
            className={`text-sm leading-relaxed whitespace-pre-line ${longDesc && !descOpen ? 'desc-collapsed' : longDesc ? 'desc-open' : ''}`}
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            {event.description}
          </p>
          {longDesc && (
            <button
              onClick={() => setDescOpen((o) => !o)}
              className="inline-flex items-center gap-1 text-sm font-semibold mt-3 hover:opacity-80 transition-opacity"
              style={{ color: '#18C8FF' }}
            >
              {descOpen ? (
                <>
                  Show less <span className="material-symbols-outlined text-[16px]">expand_less</span>
                </>
              ) : (
                <>
                  Read more <span className="material-symbols-outlined text-[16px]">expand_more</span>
                </>
              )}
            </button>
          )}
        </div>

        {videos.length > 0 && (
          <div className="mb-8">
            <h2 className="font-display font-bold text-white text-xl mb-4">
              Videos <span className="text-white/30 text-base font-normal">{videos.length}</span>
            </h2>
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))' }}>
              {videos.map((v, i) => (
                <div key={i} className="aspect-video rounded-xl overflow-hidden" style={{ background: '#000' }}>
                  <video className="w-full h-full" controls preload="none" src={v}></video>
                </div>
              ))}
            </div>
          </div>
        )}

        {embeds.length > 0 && (
          <div className="mb-8">
            <h2 className="font-display font-bold text-white text-xl mb-4">Media</h2>
            <EmbedList urls={embeds} />
          </div>
        )}
      </div>

      {/* Right: meta sidebar */}
      <div className="lg:col-span-1">
        <div className="sticky top-24 space-y-4">
          <div className="rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 className="font-display font-bold text-white text-base mb-5">Event Details</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[18px] mt-0.5 shrink-0" style={{ color: '#18C8FF' }}>
                  calendar_today
                </span>
                <div>
                  <p className="text-xs text-white/30 uppercase tracking-wider mb-0.5">Date</p>
                  <p className="text-sm text-white/80 font-medium">{dateStr}</p>
                </div>
              </div>
              {event.location && (
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[18px] mt-0.5 shrink-0" style={{ color: '#18C8FF' }}>
                    location_on
                  </span>
                  <div>
                    <p className="text-xs text-white/30 uppercase tracking-wider mb-0.5">Location</p>
                    <p className="text-sm text-white/80">{event.location}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[18px] mt-0.5 shrink-0" style={{ color: accent }}>
                  label
                </span>
                <div>
                  <p className="text-xs text-white/30 uppercase tracking-wider mb-0.5">Category</p>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(24,200,255,0.12)', color: accent }}>
                    {category}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <Link
            to="/events"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold hover:opacity-80 transition-opacity"
            style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)' }}
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back to Events
          </Link>
        </div>
      </div>
    </div>
  );
}
