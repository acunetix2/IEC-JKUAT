// IEC JKUAT — Events list. Ported from events.html + events.js.
// Fetches events via getEvents(), renders a filterable event-card grid,
// (image left/right by index), supports track filters, and shows a community
// gallery built from all event media (hidden when there are no photos).

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowUpRight, FiCalendar, FiChevronLeft, FiChevronRight, FiMapPin } from 'react-icons/fi';
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

function trackKey(category?: string): string {
  return (category || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function eventDateKey(value?: string): string | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : dateKey(date);
}

function dateFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
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
    () => (filter === 'all' ? events : events.filter((e) => trackKey(e.category ?? undefined) === filter)),
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
    <main className="catalog-page events-page">
      <section className="catalog-hero events-hero">
        <div className="catalog-hero-copy">
          <p className="section-label">Meet · Learn · Make</p>
          <h1>Good things happen when we get together.</h1>
          <p>Workshops, founder conversations and hands-on sessions that bring the IEC JKUAT community into the room.</p>
          <div className="catalog-hero-details">
            <span><strong>{events.length}</strong> events listed</span>
            <a href="#event-list" className="catalog-hero-action">Explore events <span aria-hidden="true">↓</span></a>
          </div>
        </div>
        <figure className="catalog-hero-image photo-overlay-container">
          <img src="/uploads/iec-03.jpg" alt="Students meeting and sharing ideas at IEC JKUAT" />
          <figcaption className="photo-reveal"><strong>Make time to connect</strong><span>See you at the next one.</span></figcaption>
        </figure>
      </section>

      <section className="catalog-section events-section" id="event-list" aria-labelledby="events-heading">
        <div className="catalog-section-heading">
          <div>
            <p className="section-label">What’s on</p>
            <h2 id="events-heading">Events &amp; programs</h2>
          </div>
          <p>Find a session to learn something new, meet a collaborator or share what you’re working on.</p>
        </div>
        <div className="catalog-filter-row" id="event-filters" role="group" aria-label="Filter events by track">
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
        <EventsCalendar events={events} />
        <p className="catalog-result-count">{filtered.length} {filtered.length === 1 ? 'event' : 'events'}</p>
        <div className="events-catalog-grid">
          {loading ? (
            <div className="catalog-empty-state">
              <span className="material-symbols-outlined animate-spin" aria-hidden="true">sync</span>
              <p>Loading events...</p>
            </div>
          ) : error ? (
            <p className="catalog-empty-state" role="alert">Failed to load events: {error}</p>
          ) : filtered.length === 0 ? (
            <div className="catalog-empty-state">
              <span className="material-symbols-outlined" aria-hidden="true">event_busy</span>
              <p>No events in this track right now. Check back soon for the next gathering.</p>
            </div>
          ) : (
            filtered.map((event) => <EventCard key={event.id} event={event} />)
          )}
        </div>
      </section>

      {/* Community gallery — only when there are photos */}
      {galleryImages.length > 0 && (
        <section className="catalog-section events-gallery">
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
                  className={`event-gallery-photo photo-overlay-container aspect-square overflow-hidden ${i < 2 ? '' : offset}`}
                  style={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}
                >
                  <img
                    className="w-full h-full object-cover"
                    loading="lazy"
                    src={img}
                    alt={`Event photo ${i + 1}`}
                  />
                  <div className="photo-reveal">
                    <strong>From the IEC community</strong>
                    <span>Real moments from IEC JKUAT events.</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}

function EventsCalendar({ events }: { events: EventRow[] }) {
  const todayKey = dateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, EventRow[]>();
    events.forEach((event) => {
      const key = eventDateKey(event.event_date);
      if (!key) return;
      grouped.set(key, [...(grouped.get(key) ?? []), event]);
    });
    return grouped;
  }, [events]);

  const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const gridStart = new Date(firstDay.getFullYear(), firstDay.getMonth(), 1 - firstDay.getDay());
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    return { day, key: dateKey(day), inMonth: day.getMonth() === visibleMonth.getMonth() };
  });
  const selectedEvents = eventsByDate.get(selectedDate) ?? [];
  const selectedDateLabel = dateFromKey(selectedDate).toLocaleDateString('en-KE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  function shiftMonth(delta: number) {
    setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + delta, 1));
  }

  function selectDay(key: string) {
    setSelectedDate(key);
    const day = dateFromKey(key);
    if (day.getMonth() !== visibleMonth.getMonth() || day.getFullYear() !== visibleMonth.getFullYear()) {
      setVisibleMonth(new Date(day.getFullYear(), day.getMonth(), 1));
    }
  }

  return (
    <section className="events-calendar" aria-labelledby="events-calendar-title">
      <div className="events-calendar-heading">
        <div>
          <p className="events-calendar-eyebrow"><FiCalendar aria-hidden="true" /> Event schedule</p>
          <h3 id="events-calendar-title">Find a date to join us</h3>
          <p>Scheduled events are marked on the calendar. Select a date to see what’s happening.</p>
        </div>
        <div className="events-calendar-month-nav">
          <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <FiChevronLeft aria-hidden="true" />
          </button>
          <strong aria-live="polite">
            {visibleMonth.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })}
          </strong>
          <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month">
            <FiChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="events-calendar-layout">
        <div className="events-calendar-grid" role="group" aria-label="Event calendar">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <span className="events-calendar-weekday" key={day}>{day}</span>
          ))}
          {calendarDays.map(({ day, key, inMonth }) => {
            const dayEvents = eventsByDate.get(key) ?? [];
            const isSelected = selectedDate === key;
            return (
              <button
                type="button"
                key={key}
                className={`events-calendar-day${inMonth ? '' : ' is-outside'}${isSelected ? ' is-selected' : ''}${key === todayKey ? ' is-today' : ''}${dayEvents.length ? ' has-events' : ''}`}
                aria-pressed={isSelected}
                aria-label={`${day.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}${dayEvents.length ? `, ${dayEvents.length} scheduled ${dayEvents.length === 1 ? 'event' : 'events'}` : ''}`}
                onClick={() => selectDay(key)}
              >
                <span>{day.getDate()}</span>
                {dayEvents.length > 0 && <span className="events-calendar-dots" aria-hidden="true">{dayEvents.length > 1 ? '••' : '•'}</span>}
              </button>
            );
          })}
        </div>

        <aside className="events-calendar-agenda" aria-live="polite">
          <p className="events-calendar-agenda-label">Selected day</p>
          <h4>{selectedDateLabel}</h4>
          {selectedEvents.length === 0 ? (
            <p className="events-calendar-empty">Nothing scheduled for this date yet. Choose another marked day to explore an event.</p>
          ) : (
            <div className="events-calendar-event-list">
              {selectedEvents.map((event) => (
                <Link to={`/event?id=${event.id}`} className="events-calendar-event" key={event.id}>
                  <span className="events-calendar-event-track">{event.category || 'IEC Event'}</span>
                  <strong>{event.title}</strong>
                  <span className="events-calendar-event-location"><FiMapPin aria-hidden="true" /> {event.location || 'JKUAT Main Campus'}</span>
                  <span className="events-calendar-event-link">Event details <FiArrowUpRight aria-hidden="true" /></span>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function EventCard({ event }: { event: EventRow }) {
  const category = event.category || undefined;
  const date = event.event_date ? new Date(event.event_date) : null;
  const validDate = date && !isNaN(date.getTime());
  const day = validDate ? date!.getDate() : '—';
  const month = validDate ? date!.toLocaleString('en', { month: 'short' }).toUpperCase() : '';
  const year = validDate ? date!.getFullYear() : '';
  const isPast = Boolean(validDate && date! < new Date());
  const track = trackKey(category);
  const mediaUrls = parseMediaUrls(event.media_urls);
  const previewImg = mediaUrls.find((u) => isPreviewImage(u)) || EVENT_FALLBACK_IMG;
  const categoryLabel = category || 'Event';
  const imageDescription = event.title ? `${event.title} event` : 'IEC JKUAT event';

  return (
    <Link
      to={`/event?id=${event.id}`}
      className="event-card event-catalog-card group"
      data-track={track}
      aria-label={`View details for ${event.title}`}
    >
      <div className="event-catalog-image">
        <img src={previewImg} alt={imageDescription} loading="lazy" style={isPast ? { filter: 'grayscale(25%)' } : undefined} />
        <span className="event-catalog-track">{categoryLabel}</span>
        <span className="event-catalog-date"><strong>{day}</strong><span>{month || 'DATE'}{year ? ` · ${year}` : ''}</span></span>
        {isPast && <span className="event-catalog-past">Past event</span>}
        <div className="catalog-card-reveal" aria-hidden="true">
          <strong>{event.title}</strong>
          <p>{event.description || 'Details for this IEC JKUAT event will be shared soon.'}</p>
          <small>{event.location || 'JKUAT Main Campus'} · {day} {month} {year}</small>
          <span>Explore event <span aria-hidden="true">↗</span></span>
        </div>
      </div>
      <div className="event-catalog-copy">
        <p className="section-label">{categoryLabel}</p>
        <h3>{event.title}</h3>
        <p className="event-catalog-description">{event.description || 'Details for this IEC JKUAT event will be shared soon.'}</p>
        <div className="event-catalog-footer">
          <span>{event.location || 'JKUAT Main Campus'}</span>
          <span>View event <span aria-hidden="true">↗</span></span>
        </div>
      </div>
    </Link>
  );
}
