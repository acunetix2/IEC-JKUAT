// IEC JKUAT — Home. Ported from index.html.
// Hero (Hero3D canvas + two-column content), What is IEC, What we do (6-cell
// grid), photo marquee, the pinned horizontal Journey, Who can join, Upcoming
// events (from Supabase), Have-an-idea split, and the Join section with the
// two-step Registration / Activation flow. Motion comes from useHomeMotion +
// useReveal; the hero entrance uses a double-rAF to add .go after first paint.

import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Hero3D from '../components/Hero3D';
import { useReveal, splitWords } from '../hooks/useReveal';
import { useHomeMotion } from '../hooks/useHomeMotion';
import { useToast } from '../context/ToastContext';
import { supabase, submitMemberRegistration, lookupMemberByReg, initiatePayment } from '../lib/supabase';
import type { MemberLookup } from '../types/db';

const DO_CARDS = [
  { n: '01', icon: 'construction', color: 'text-iec-blue', photo: 'iec-01.jpg', title: 'Build', text: 'Turn an idea into something people can actually use. Prototypes, MVPs, real products.' },
  { n: '02', icon: 'emoji_events', color: 'text-iec-gold', photo: 'iec-02.jpg', title: 'Compete', text: 'Hackathons, innovation challenges and competitions. Represent JKUAT, win things, prove what you\'ve got.' },
  { n: '03', icon: 'school', color: 'text-iec-blue', photo: 'iec-03.jpg', title: 'Learn', text: 'Workshops, founder talks and practical sessions on things your lecturers won\'t cover.' },
  { n: '04', icon: 'hub', color: 'text-iec-gold', photo: 'iec-05.jpg', title: 'Connect', text: 'Meet students, founders, mentors and professionals. Your network will matter more than your GPA.' },
  { n: '05', icon: 'record_voice_over', color: 'text-iec-blue', photo: 'iec-07.jpg', title: 'Lead', text: 'Take responsibility. Organise events, run projects, and grow into the kind of person others follow.' },
  { n: '06', icon: 'public', color: 'text-iec-gold', photo: 'iec-08.jpg', title: 'Impact', text: 'Build solutions that address real problems around us. Not just for the marks.' },
];

const JOURNEY = [
  { n: '01', title: 'Discover', text: 'Find problems worth solving. Ask questions. Look around. The best ideas start with noticing something that doesn\'t work.' },
  { n: '02', title: 'Create', text: 'Sketch it out. Brainstorm with others. Shape a vague idea into something that has a direction.' },
  { n: '03', title: 'Build', text: 'Work with a team. Make something tangible. A working prototype beats a perfect plan every time.' },
  { n: '04', title: 'Test', text: 'Get feedback from real users. Break it. Fix it. Learn more in a week of testing than a semester of theory.' },
  { n: '05', title: 'Launch', text: 'Take your project beyond the classroom. Into the real world. Into the hands of the people it was built for.' },
];

const MARQUEE = ['iec-12.jpg','iec-06.jpg','iec-16.jpg','iec-04.jpg','iec-14.jpg','iec-07.jpg','iec-03.jpg','iec-19.jpg','iec-05.jpg','iec-08.jpg','iec-18.jpg','iec-02.jpg','iec-17.jpg','iec-01.jpg','iec-09.jpg','iec-10.jpg','iec-11.jpg','iec-13.jpg','iec-15.jpg','iec.jpeg'];

const DISCIPLINES = ['Designer','Engineer','Business student','Developer','Artist','Agriculture student','Health Sciences','Law student','Still figuring it out'];

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const CAT_COLORS: Record<string, string> = {
  fintech: 'text-iec-blue', agtech: 'text-green-400', leadership: 'text-iec-gold',
  hackathon: 'text-iec-blue', networking: 'text-red-400', workshop: 'text-green-400',
};

interface HomeEvent {
  id: string;
  title: string;
  event_date: string;
  category?: string;
  location?: string;
}

export default function Home() {
  useReveal();
  useHomeMotion();

  // Hero entrance: add .go after first paint (double rAF), mirroring source.
  useEffect(() => {
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => {
        document.querySelectorAll('.hero-animate').forEach((el) => el.classList.add('go'));
      });
      return () => cancelAnimationFrame(id2);
    });
    return () => cancelAnimationFrame(id1);
  }, []);

  return (
    <>
      <HeroSection />
      <WhatIsSection />
      <hr className="rule mx-6 md:mx-16" />
      <WhatWeDoSection />
      <hr className="rule mx-6 md:mx-16" />
      <Marquee />
      <JourneySection />
      <hr className="rule mx-6 md:mx-16" />
      <WhoCanJoinSection />
      <UpcomingEventsSection />
      <IdeaSection />
      <hr className="rule mx-6 md:mx-16" />
      <JoinSection />
    </>
  );
}

function HeroSection() {
  return (
    <section
      className="hero relative flex flex-col justify-center overflow-hidden noise"
      style={{ minHeight: '100svh', maxHeight: '1000px', background: 'radial-gradient(ellipse 110% 90% at 70% 40%, rgba(0,46,80,0.7), transparent)' }}
    >
      <Hero3D />
      <div className="relative z-10 px-6 md:px-16 max-w-screen-xl mx-auto w-full pt-8 pb-0 md:py-12 mt-12 md:mt-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 items-center">
          <div>
            <h1 className="font-display font-extrabold text-white mb-3 md:mb-4" style={{ fontSize: 'clamp(2rem, 3.8vw, 3.8rem)', lineHeight: 1.08, letterSpacing: '-0.03em' }}>
              <span className="block overflow-hidden"><span className="block hero-animate" style={{ transitionDelay: '0.15s' }}>Ideas are</span></span>
              <span className="block overflow-hidden"><span className="block text-iec-blue hero-animate" style={{ transitionDelay: '0.25s' }}>everywhere.</span></span>
              <span className="block overflow-hidden"><span className="block hero-animate" style={{ transitionDelay: '0.35s' }}>Let's build</span></span>
              <span className="block overflow-hidden"><span className="block hero-animate" style={{ transitionDelay: '0.45s' }}>them.</span></span>
            </h1>
            <p className="text-white/55 text-sm font-light max-w-md leading-relaxed mb-5 md:mb-6 hero-animate" style={{ transitionDelay: '0.6s' }}>
              IEC JKUAT is a student community turning ideas into projects, businesses and solutions that matter.
            </p>
            <div className="flex flex-wrap gap-3 mb-5 md:mb-6 hero-animate" style={{ transitionDelay: '0.7s' }}>
              <a href="#join" className="btn-primary" data-magnetic="0.3">
                Join IEC <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </a>
              <a href="#what-we-do" className="btn-ghost">
                What we do <span className="material-symbols-outlined text-[18px]">expand_more</span>
              </a>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-2 md:gap-5 pt-5 border-t border-white/8 hero-animate" style={{ transitionDelay: '0.85s' }}>
              {['Innovation', 'Entrepreneurship', 'Leadership', 'Community'].map((t, i) => (
                <span key={t} className="contents">
                  <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-white/40">{t}</span>
                  {i < 3 && <span className="text-white/10 hidden sm:inline">·</span>}
                </span>
              ))}
            </div>
            <div className="flex md:hidden gap-6 pt-5 hero-animate" style={{ transitionDelay: '0.95s' }}>
              <div><p className="text-iec-blue font-extrabold font-display text-xl leading-none">200+</p><p className="text-white/50 text-[10px] mt-1 uppercase tracking-wider">Members</p></div>
              <div><p className="text-iec-blue font-extrabold font-display text-xl leading-none">30+</p><p className="text-white/50 text-[10px] mt-1 uppercase tracking-wider">Projects</p></div>
              <div><p className="text-iec-gold font-extrabold font-display text-xl leading-none">20+</p><p className="text-white/50 text-[10px] mt-1 uppercase tracking-wider">Events / yr</p></div>
            </div>
            <div className="md:hidden mt-5 -mx-6 overflow-hidden hero-animate" style={{ transitionDelay: '1.05s' }}>
              <img src="/uploads/iec-12.jpg" alt="IEC JKUAT members at a club event" className="block w-full aspect-video object-cover" style={{ filter: 'saturate(1.0) brightness(0.95)' }} />
            </div>
          </div>

          <div className="hidden md:flex flex-col items-end gap-3 relative hero-animate" style={{ transitionDelay: '0.4s', maxHeight: 'calc(100svh - 200px)' }}>
            <div className="rounded px-5 py-3 text-right self-end" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}>
              <p className="text-iec-blue font-extrabold font-display text-2xl leading-none">200+</p>
              <p className="text-white/50 text-xs mt-0.5 uppercase tracking-wider font-medium">Active Members</p>
            </div>
            <div className="relative w-full rounded overflow-hidden flex-1" style={{ minHeight: 0, maxWidth: '420px' }}>
              <img src="/uploads/iec-12.jpg" alt="IEC JKUAT members at a club event" className="w-full h-full object-cover" style={{ filter: 'saturate(1.0) brightness(0.95)' }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(0,174,239,0.15) 0%, transparent 50%)' }} />
              <div className="absolute bottom-3 left-4 right-4">
                <p className="text-white/80 text-xs font-semibold uppercase tracking-widest">Silicon Savannah</p>
                <p className="text-white/50 text-[10px] mt-0.5">JKUAT, Kenya</p>
              </div>
            </div>
            <div className="flex gap-3 w-full" style={{ maxWidth: '420px' }}>
              <div className="flex-1 rounded px-4 py-3" style={{ background: 'rgba(0,174,239,0.08)', border: '1px solid rgba(0,174,239,0.2)', backdropFilter: 'blur(12px)' }}>
                <p className="text-iec-blue font-extrabold font-display text-2xl leading-none">30+</p>
                <p className="text-white/50 text-[10px] mt-1 uppercase tracking-wider">Projects</p>
              </div>
              <div className="flex-1 rounded px-4 py-3" style={{ background: 'rgba(251,176,59,0.08)', border: '1px solid rgba(251,176,59,0.2)', backdropFilter: 'blur(12px)' }}>
                <p className="text-iec-gold font-extrabold font-display text-2xl leading-none">20+</p>
                <p className="text-white/50 text-[10px] mt-1 uppercase tracking-wider">Events / yr</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-2 opacity-30">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-white">Scroll</span>
        <div className="w-px h-8 bg-white/30 relative overflow-hidden">
          <div className="absolute top-0 w-full h-1/2 bg-white animate-bounce"></div>
        </div>
      </div>
    </section>
  );
}

function WhatIsSection() {
  return (
    <section className="pt-4 pb-8 md:py-12 px-6 md:px-16 max-w-screen-xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-24 items-center">
        <div>
          <p className="section-label mb-6" data-reveal="fade">What is IEC?</p>
          <h2 className="font-display font-bold text-white leading-tight mb-8" style={{ fontSize: 'clamp(2.5rem, 5vw, 3.6rem)' }} data-split data-reveal="up">
            {splitWords('A student movement. Not a lecture.').map((w, i, all) => (
              <span key={i}>
                <span className="split-word" style={w.style}>{w.word}</span>
                {i < all.length - 1 ? ' ' : ''}
              </span>
            ))}
          </h2>
          <p className="text-white/55 text-base leading-relaxed mb-6" data-reveal="up" style={{ transitionDelay: '0.15s' }}>
            IEC JKUAT isn't a class you sit in. It's a space where students from every discipline at JKUAT come together to experiment, build things, solve real problems and grow beyond their degree.
          </p>
          <p className="text-white/55 text-base leading-relaxed mb-10" data-reveal="up" style={{ transitionDelay: '0.25s' }}>
            Whether you have a startup idea, a skill you want to apply, or you're still figuring out what you're about — there's a place for you here.
          </p>
          <div className="md:hidden mt-2 rounded-xl overflow-hidden" data-reveal="up">
            <img loading="lazy" src="/uploads/iec.jpeg" alt="IEC award handover in front of the club banner" className="w-full h-60 object-cover" />
          </div>
        </div>
        <div className="relative h-[520px] hidden md:block" data-reveal="right" style={{ transitionDelay: '0.2s' }}>
          <div className="absolute inset-0 rounded-sm overflow-hidden">
            <img loading="lazy" src="/uploads/iec.jpeg" alt="IEC award handover in front of the club banner" className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(10,10,10,0.25) 0%, transparent 55%, rgba(0,174,239,0.08) 100%)' }} />
          </div>
          <div className="absolute top-6 right-6 w-44 rounded overflow-hidden shadow-2xl border border-white/10" style={{ transform: 'rotate(3deg)' }}>
            <img loading="lazy" src="/uploads/iec-06.jpg" alt="IEC recruitment desk" className="w-full h-28 object-cover" />
            <div className="bg-[#0f0f0f] px-3 py-2">
              <p className="text-white text-[11px] font-bold">Recruitment Drive</p>
              <p className="text-white/40 text-[10px]">JKUAT Main Campus</p>
            </div>
          </div>
          <div className="absolute bottom-12 left-6 px-5 py-4 rounded shadow-xl" style={{ background: 'rgba(0,174,239,0.15)', border: '1px solid rgba(0,174,239,0.3)', backdropFilter: 'blur(12px)' }}>
            <p className="text-iec-blue font-extrabold text-2xl font-display leading-none">Est. 2020</p>
            <p className="text-white/40 text-xs mt-1">Building since day one</p>
          </div>
          <div className="absolute bottom-6 right-8 w-36 h-24 rounded overflow-hidden shadow-xl border border-white/8" style={{ transform: 'rotate(-2deg)' }}>
            <img loading="lazy" src="/uploads/iec-14.jpg" alt="IEC members group photo" className="w-full h-full object-cover opacity-100" />
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,174,239,0.15), transparent 70%)', filter: 'blur(30px)' }} />
        </div>
      </div>
    </section>
  );
}

function WhatWeDoSection() {
  return (
    <section id="what-we-do" className="py-10 md:py-16">
      <div className="px-6 md:px-16 max-w-screen-xl mx-auto mb-8">
        <p className="section-label mb-4" data-reveal="fade">What we do</p>
        <h2 className="font-display font-bold text-white leading-tight" style={{ fontSize: 'clamp(2.5rem, 5vw, 3.4rem)' }} data-reveal="up">
          Six ways to show up.
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {DO_CARDS.map((c, i) => (
          <div key={c.n} className="do-card" data-reveal="up" style={{ transitionDelay: `${0.05 * (i + 1)}s` }}>
            <img className="do-card-photo" loading="lazy" src={`/uploads/${c.photo}`} alt="" />
            <span className="do-number">{c.n}</span>
            <span className={`do-icon material-symbols-outlined ${c.color}`} style={{ fontSize: '32px', fontVariationSettings: "'FILL' 1" }}>{c.icon}</span>
            <h3 className="font-display font-bold text-white text-xl mb-3">{c.title}</h3>
            <p className="text-white/60 text-sm leading-relaxed">{c.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Marquee() {
  const all = [...MARQUEE, ...MARQUEE];
  return (
    <div className="py-6 overflow-hidden" style={{ background: 'rgba(255,255,255,0.015)' }}>
      <div className="marquee-track">
        {all.map((img, i) => (
          <img
            key={i}
            className="marquee-photo"
            loading="lazy"
            src={`/uploads/${img}`}
            alt={i < MARQUEE.length ? 'IEC club photo' : ''}
            aria-hidden={i >= MARQUEE.length}
          />
        ))}
      </div>
    </div>
  );
}

function JourneySection() {
  return (
    <div id="journey-section">
      <div className="journey-sticky">
        <div className="px-6 md:px-16 mb-12 max-w-screen-xl mx-auto w-full">
          <p className="section-label mb-4" data-reveal="fade">The IEC journey</p>
          <h2 className="font-display font-bold text-white" style={{ fontSize: 'clamp(2.3rem, 5vw, 3.2rem)' }} data-reveal="up">
            From idea to impact.
          </h2>
        </div>
        <div id="journey-track" className="flex overflow-visible pl-6 md:pl-16 pb-4" style={{ willChange: 'transform' }}>
          {JOURNEY.map((s, i) => (
            <div
              key={s.n}
              className={`journey-step ${i === 0 ? 'journey-active' : ''} ${i === JOURNEY.length - 1 ? 'journey-step-last' : ''}`}
            >
              <div className="font-display font-extrabold text-iec-blue text-5xl md:text-6xl mb-6 leading-none">{s.n}</div>
              <h3 className="font-display font-bold text-white text-2xl mb-3">{s.title}</h3>
              <p className="text-white/60 text-sm leading-relaxed max-w-xs">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WhoCanJoinSection() {
  return (
    <section className="py-10 md:py-16 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img loading="lazy" src="/uploads/iec-07.jpg" alt="" className="w-full h-full object-cover" style={{ filter: 'saturate(0.9) brightness(0.65)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(10,10,10,0.88) 20%, rgba(10,10,10,0.5) 60%, rgba(10,10,10,0.75) 100%)' }} />
      </div>
      <div className="relative z-10 px-6 md:px-16 max-w-screen-xl mx-auto">
        <div className="max-w-2xl mb-8">
          <p className="section-label mb-6" data-reveal="fade">Who can join?</p>
          <h2 className="font-display font-black text-white leading-tight" style={{ fontSize: 'clamp(2.5rem, 5.5vw, 4.2rem)', letterSpacing: '-0.03em' }} data-reveal="up">
            You don't have<br />to be a techie.
          </h2>
        </div>
        <div className="flex gap-2 mb-10 overflow-x-auto scrollbar-hide pb-1" data-reveal="up" style={{ transitionDelay: '0.15s' }}>
          {DISCIPLINES.map((d) => (
            <span key={d} className="discipline-tag shrink-0">{d}</span>
          ))}
        </div>
        <div className="border-l-2 border-iec-blue pl-8 max-w-xl" data-reveal="left" style={{ transitionDelay: '0.25s' }}>
          <p className="text-white/70 text-lg md:text-xl font-light leading-relaxed italic">"Great ideas rarely come from one discipline."</p>
          <p className="text-white/50 text-sm mt-3 font-medium">— IEC JKUAT</p>
        </div>
      </div>
    </section>
  );
}

function UpcomingEventsSection() {
  const [events, setEvents] = useState<HomeEvent[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    supabase
      .from('events')
      .select('id, title, event_date, category, location')
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true })
      .limit(5)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setFailed(true);
        else setEvents((data ?? []) as HomeEvent[]);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="py-10 md:py-16" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <div className="px-6 md:px-16 max-w-screen-xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-6 mb-12">
          <div>
            <p className="section-label mb-4" data-reveal="fade">What's happening?</p>
            <h2 className="font-display font-bold text-white" style={{ fontSize: 'clamp(2.3rem, 5vw, 3.2rem)' }} data-reveal="up">
              Upcoming events
            </h2>
          </div>
          <Link to="/events" className="btn-ghost text-sm self-start md:self-auto" data-reveal="fade">
            All events <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>

        {events === null && !failed ? (
          <div className="py-16 text-center text-white/30 text-sm">
            <span className="material-symbols-outlined animate-spin inline-block mb-2" style={{ fontSize: '24px' }}>sync</span>
            <p>Loading events…</p>
          </div>
        ) : failed ? (
          <p className="text-white/20 text-sm text-center py-8">Could not load events.</p>
        ) : events && events.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-white/25 text-sm">No events scheduled yet. Check back soon.</p>
          </div>
        ) : (
          <div>
            {events!.map((ev) => {
              const d = new Date(ev.event_date);
              const validDate = !isNaN(d.getTime());
              const cat = (ev.category || '').toLowerCase();
              const col = CAT_COLORS[cat] || 'text-iec-blue';
              return (
                <Link key={ev.id} to={`/event?id=${ev.id}`} className="event-item group revealed">
                  <div className="text-center shrink-0">
                    <div className="font-display font-extrabold text-white text-2xl leading-none">{validDate ? d.getDate() : '—'}</div>
                    <div className="text-white/40 text-[10px] font-bold tracking-widest">{validDate ? MONTHS[d.getMonth()] : ''}</div>
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-white text-base leading-tight truncate group-hover:text-iec-blue transition-colors">{ev.title}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      {ev.category && <span className={`text-[11px] font-bold uppercase tracking-wider ${col}`}>{ev.category}</span>}
                      {ev.location && <span className="text-white/40 text-[11px]">{ev.location}</span>}
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-white/15 group-hover:text-iec-blue group-hover:translate-x-1 transition-all text-[20px] shrink-0">arrow_forward</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function IdeaSection() {
  return (
    <section className="py-10 md:py-16 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,174,239,0.08), transparent 70%)', filter: 'blur(60px)' }} />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(251,176,59,0.08), transparent 70%)', filter: 'blur(60px)' }} />
      <div className="relative z-10 px-6 md:px-16 max-w-screen-xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-0">
          <div className="idea-card md:border-r border-white/8 md:pr-16 relative" data-reveal="left">
            <div className="idea-photo absolute top-0 right-8 w-20 h-20 rounded overflow-hidden opacity-50 hidden md:block">
              <img loading="lazy" src="/uploads/iec-14.jpg" alt="" className="w-full h-full object-cover" />
            </div>
            <p className="md:hidden font-display font-extrabold text-iec-blue text-sm tracking-[0.2em] mb-3">01</p>
            <p className="font-display font-extrabold text-white leading-tight mb-4" style={{ fontSize: 'clamp(2.5rem, 5vw, 3.4rem)' }}>
              Have an<br /><span className="text-iec-blue">idea?</span>
            </p>
            <p className="text-white/60 text-base leading-relaxed">
              Great. Let's find out if it's worth building. IEC gives you the people, tools and environment to take it seriously.
            </p>
            <a href="#join" className="btn-primary w-full justify-center mt-6 md:hidden">Join IEC <span className="material-symbols-outlined text-[18px]">arrow_forward</span></a>
          </div>
          <div className="idea-card md:pl-16 relative" data-reveal="right" style={{ transitionDelay: '0.15s' }}>
            <div className="idea-photo absolute top-0 right-0 w-20 h-20 rounded overflow-hidden opacity-50 hidden md:block">
              <img loading="lazy" src="/uploads/iec-05.jpg" alt="" className="w-full h-full object-cover" />
            </div>
            <p className="md:hidden font-display font-extrabold text-iec-gold text-sm tracking-[0.2em] mb-3">02</p>
            <p className="font-display font-extrabold text-white leading-tight mb-4" style={{ fontSize: 'clamp(2.5rem, 5vw, 3.4rem)' }}>
              Don't have<br /><span className="text-iec-gold">an idea?</span>
            </p>
            <p className="text-white/60 text-base leading-relaxed">
              Also great. IEC isn't only for people who already have startups. It's for students who want to explore, experiment, meet people and figure out what they're capable of.
            </p>
            <a href="#join" className="btn-primary w-full justify-center mt-6 md:hidden">Join IEC <span className="material-symbols-outlined text-[18px]">arrow_forward</span></a>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-white/6 text-center" data-reveal="up" style={{ transitionDelay: '0.3s' }}>
          <p className="ghost-text font-display font-black uppercase tracking-[0.2em] text-sm">You just need curiosity.</p>
        </div>
      </div>
    </section>
  );
}

function JoinSection() {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [preview, setPreview] = useState<MemberLookup | null>(null);

  const [reg, setReg] = useState({ fullName: '', regNumber: '', college: '', course: '', yearOfStudy: '', phone: '', email: '' });
  const [regBusy, setRegBusy] = useState(false);

  const [payReg, setPayReg] = useState('');
  const [payPhone, setPayPhone] = useState('');
  const [payBusy, setPayBusy] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; ref?: string; error?: string } | null>(null);

  const setRegField = (k: keyof typeof reg) => (e: { target: { value: string } }) => setReg((r) => ({ ...r, [k]: e.target.value }));

  async function handleRegistration(e: FormEvent) {
    e.preventDefault();
    setRegBusy(true);
    try {
      const data = await submitMemberRegistration({
        fullName: reg.fullName.trim(),
        regNumber: reg.regNumber.trim(),
        college: reg.college,
        course: reg.course.trim(),
        yearOfStudy: reg.yearOfStudy,
        phone: reg.phone.trim(),
        email: reg.email.trim(),
      });
      setMemberId(data[0].id);
      setPayReg(reg.regNumber.trim());
      setPreview(data[0]);
      setStep(2);
    } catch (err) {
      toast('Registration failed: ' + (err as Error).message, 'error');
    } finally {
      setRegBusy(false);
    }
  }

  // Returns the member's id, or null if not found (and toasts why).
  async function lookupMember(): Promise<string | null> {
    if (!payReg.trim()) {
      toast('Enter a registration number first', 'error');
      return null;
    }
    setLookupBusy(true);
    try {
      const data = await lookupMemberByReg(payReg.trim());
      if (!data) throw new Error('Member not found. Please register first.');
      setMemberId(data.id);
      setPreview(data);
      toast('Member found!', 'success');
      return data.id;
    } catch (err) {
      setMemberId(null);
      setPreview(null);
      toast((err as Error).message, 'error');
      return null;
    } finally {
      setLookupBusy(false);
    }
  }

  async function handlePayment(e: FormEvent) {
    e.preventDefault();
    if (!payReg.trim()) {
      toast('Enter your registration number first', 'error');
      return;
    }
    // Pay directly without pressing Find: look the member up once here.
    const id = memberId ?? (await lookupMember());
    if (!id) return;
    setPayBusy(true);
    setStatus(null);
    try {
      const result = (await initiatePayment(payPhone.trim(), 200, id)) as { transactionRef?: string };
      setStatus({ ok: true, ref: result?.transactionRef });
      setMemberId(null);
    } catch (err) {
      setStatus({ ok: false, error: (err as Error).message });
    } finally {
      setPayBusy(false);
    }
  }

  return (
    <section className="join-bg py-10 md:py-16 px-6 md:px-16" id="join">
      <div className="max-w-screen-xl mx-auto">
        <div className="max-w-2xl mx-auto text-center mb-8">
          <p className="section-label mb-6" data-reveal="fade">Ready?</p>
          <h2 className="font-display font-black text-white leading-none mb-6" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', letterSpacing: '-0.03em' }} data-reveal="up">
            Ready to build<br />with us?
          </h2>
          <p className="text-white/45 text-base leading-relaxed" data-reveal="up" style={{ transitionDelay: '0.15s' }}>
            Open to all JKUAT students. KES 200 per semester. Fill in your details, then complete activation via M-Pesa.
          </p>
        </div>

        <div className="max-w-2xl mx-auto" data-reveal="up" style={{ transitionDelay: '0.25s' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'visible' }}>
            <div className="flex" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <button className={`step-tab ${step === 1 ? 'active' : ''}`} onClick={() => setStep(1)}>01 — Registration</button>
              <button className={`step-tab ${step === 2 ? 'active' : ''}`} onClick={() => setStep(2)}>02 — Activation</button>
            </div>

            {step === 1 ? (
              <div className="p-5 sm:p-8 md:p-10">
                <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleRegistration}>
                  <div className="md:col-span-2">
                    <label className="block text-[13px] font-medium text-white/60 mb-1.5">Full Name *</label>
                    <input className="iec-input" placeholder="Jane Mwangi" required type="text" value={reg.fullName} onChange={setRegField('fullName')} />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-white/60 mb-1.5">Reg Number *</label>
                    <input className="iec-input" placeholder="SCT211-XXXX/20XX" required type="text" value={reg.regNumber} onChange={setRegField('regNumber')} />
                  </div>
                  <div style={{ position: 'relative', zIndex: 50 }}>
                    <label className="block text-[13px] font-medium text-white/60 mb-1.5">College *</label>
                    <select className="iec-input" required value={reg.college} onChange={setRegField('college')}>
                      <option value="">Select college</option>
                      <option>COPAS</option>
                      <option>COETEC</option>
                      <option>COHES</option>
                      <option>COANRE</option>
                      <option>COHRED</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-white/60 mb-1.5">Course *</label>
                    <input className="iec-input" placeholder="e.g. BSc Computer Science" required type="text" value={reg.course} onChange={setRegField('course')} />
                  </div>
                  <div style={{ position: 'relative', zIndex: 40 }}>
                    <label className="block text-[13px] font-medium text-white/60 mb-1.5">Year of Study *</label>
                    <select className="iec-input" required value={reg.yearOfStudy} onChange={setRegField('yearOfStudy')}>
                      <option value="">Select year</option>
                      <option>1</option>
                      <option>2</option>
                      <option>3</option>
                      <option>4</option>
                      <option>5</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-white/60 mb-1.5">Phone *</label>
                    <input className="iec-input" placeholder="07XXXXXXXX" required type="tel" value={reg.phone} onChange={setRegField('phone')} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[13px] font-medium text-white/60 mb-1.5">JKUAT Email *</label>
                    <input className="iec-input" placeholder="user@students.jkuat.ac.ke" required type="email" value={reg.email} onChange={setRegField('email')} />
                  </div>
                  <div className="md:col-span-2 mt-2">
                    <button className="btn-primary w-full justify-center" type="submit" disabled={regBusy}>
                      {regBusy ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> Registering…
                        </>
                      ) : (
                        <>
                          Register <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="p-5 sm:p-8 md:p-10">
                <div className="text-center mb-8">
                  <div className="inline-flex w-14 h-14 rounded-full items-center justify-center mb-4" style={{ background: 'rgba(0,174,239,0.12)' }}>
                    <span className="material-symbols-outlined text-iec-blue" style={{ fontSize: '28px', fontVariationSettings: "'FILL' 1" }}>payments</span>
                  </div>
                  <h3 className="font-display font-bold text-white text-xl mb-1">Activate Membership</h3>
                  <p className="text-white/40 text-sm">New member or renewing for a new semester? Pay KES 200 via M-Pesa.</p>
                </div>
                <form className="max-w-sm mx-auto space-y-4" onSubmit={handlePayment}>
                  <div>
                    <label className="block text-[13px] font-medium text-white/60 mb-1.5">Registration Number *</label>
                    <div className="flex gap-2">
                      <input
                        className="iec-input flex-1"
                        placeholder="SCT211-XXXX/20XX"
                        required
                        type="text"
                        value={payReg}
                        onChange={(e) => {
                          // A looked-up member belongs to the old value; never pay for them by mistake.
                          setPayReg(e.target.value);
                          setMemberId(null);
                          setPreview(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={lookupMember}
                        disabled={lookupBusy}
                        className="px-4 py-2 text-sm font-bold rounded text-iec-blue shrink-0 hover:bg-white/5 transition-all"
                        style={{ border: '1px solid rgba(0,174,239,0.4)' }}
                      >
                        {lookupBusy ? '…' : 'Find'}
                      </button>
                    </div>
                    <p className="text-white/40 text-xs mt-1.5">Enter your reg number and click Find, or just pay directly.</p>
                  </div>

                  {preview && (
                    <div className="px-4 py-3 rounded flex items-center gap-3" style={{ background: 'rgba(0,174,239,0.08)', border: '1px solid rgba(0,174,239,0.2)' }}>
                      <span className="material-symbols-outlined text-iec-blue text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{preview.full_name || '—'}</p>
                        <p className="text-white/40 text-xs truncate">{preview.reg_number || '—'}</p>
                      </div>
                      <span className="material-symbols-outlined text-iec-blue text-[16px] ml-auto shrink-0">check_circle</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between px-4 py-3 rounded" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <span className="text-white/35 text-xs uppercase tracking-widest">Amount Due</span>
                    <span className="font-display font-extrabold text-iec-blue text-2xl">KES 200</span>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-white/60 mb-1.5">M-Pesa Number *</label>
                    <input className="iec-input" placeholder="07XXXXXXXX" required type="tel" value={payPhone} onChange={(e) => setPayPhone(e.target.value)} />
                    <p className="text-white/40 text-xs mt-1.5">Can be any Safaricom number — yours or someone else's.</p>
                  </div>

                  <button className="btn-primary w-full justify-center" type="submit" disabled={payBusy}>
                    {payBusy ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> Processing…
                      </>
                    ) : (
                      <>
                        Pay via M-Pesa <span className="material-symbols-outlined text-[18px]">bolt</span>
                      </>
                    )}
                  </button>
                </form>

                {status && (
                  <div className="mt-6 p-5 rounded text-center" style={{ background: status.ok ? 'rgba(0,174,239,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${status.ok ? 'rgba(0,174,239,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                    {status.ok ? (
                      <>
                        <div className="flex items-center justify-center gap-2 text-iec-blue font-semibold text-sm">
                          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          STK Push sent!
                        </div>
                        <p className="text-white/40 text-xs mt-2">Check your phone for the M-Pesa prompt and enter your PIN.</p>
                        <p className="text-white/40 text-xs mt-1">Ref: {status.ref || '—'}</p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-center gap-2 text-red-400 font-semibold text-sm">
                          <span className="material-symbols-outlined text-[18px]">error</span>
                          Payment failed
                        </div>
                        <p className="text-white/40 text-xs mt-2">{status.error}</p>
                      </>
                    )}
                  </div>
                )}

                <p className="text-center mt-6">
                  <button onClick={() => setStep(1)} className="text-white/50 text-xs hover:text-white/70 transition-colors">
                    ← Register a new member instead
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
