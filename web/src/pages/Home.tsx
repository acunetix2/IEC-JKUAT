// IEC JKUAT homepage. Membership registration and M-Pesa activation share
// the same API flow as the previous homepage.

import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowRight,
  FiArrowUpRight,
  FiAlertCircle,
  FiBookOpen,
  FiCheck,
  FiCompass,
  FiCreditCard,
  FiLayers,
  FiMapPin,
  FiUsers,
} from 'react-icons/fi';
import { useReveal } from '../hooks/useReveal';
import { useToast } from '../context/ToastContext';
import { supabase, submitMemberRegistration, lookupMemberByReg, initiatePayment } from '../lib/supabase';
import CustomSelect from '../components/CustomSelect';
import {
  normalizeKenyanPhone,
  validateEmail,
  validateKenyanPhone,
  validatePersonName,
  validateRegistrationNumber,
  validateRequiredText,
} from '../lib/validation';
import type { MemberLookup } from '../types/db';

const DO_CARDS = [
  { n: '01', icon: FiLayers, photo: 'iec-08.jpg', title: 'Build', text: 'Turn early ideas into prototypes, products and ventures with a team.' },
  { n: '02', icon: FiCompass, photo: 'iec-03.jpg', title: 'Explore', text: 'Take part in challenges, pitch sessions and competitions across JKUAT.' },
  { n: '03', icon: FiBookOpen, photo: 'iec-07.jpg', title: 'Learn', text: 'Build practical skills through workshops, peer learning and founder talks.' },
  { n: '04', icon: FiUsers, photo: 'iec-05.jpg', title: 'Connect', text: 'Meet collaborators, mentors and people who are working on meaningful ideas.' },
];

const JOURNEY = [
  { n: '01', title: 'Notice', text: 'Observe campus and community needs, then ask useful questions.' },
  { n: '02', title: 'Shape', text: 'Test assumptions and decide what a first version could look like.' },
  { n: '03', title: 'Build', text: 'Work with a team to create a prototype, service or first experiment.' },
  { n: '04', title: 'Learn', text: 'Share the work, collect feedback and improve what you have made.' },
  { n: '05', title: 'Share', text: 'Present your progress and agree on the next practical step.' },
];

const DISCIPLINES = ['Designer','Engineer','Business student','Developer','Artist','Agriculture student','Health Sciences','Law student','Still figuring it out'];

const BENEFITS = [
  { icon: FiUsers, title: 'A collaborative community', text: 'Find teammates, exchange skills and get honest feedback from fellow students.' },
  { icon: FiBookOpen, title: 'Practical learning', text: 'Develop skills in entrepreneurship, product thinking, teamwork and pitching.' },
  { icon: FiLayers, title: 'Room to experiment', text: 'Move a project forward with peer support, structured sessions and shared tools.' },
  { icon: FiCompass, title: 'Opportunities to grow', text: 'Represent JKUAT at showcases, competitions and conversations with founders.' },
];

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

  return (
    <main className="home-page">
      <HeroSection />
      <AtAGlanceSection />
      <WhatIsSection />
      <WhatWeDoSection />
      <PhotoGallery />
      <JourneySection />
      <WhoCanJoinSection />
      <BenefitsSection />
      <UpcomingEventsSection />
      <IdeaSection />
      <JoinSection />
      <PartnersSection />
    </main>
  );
}

const AT_A_GLANCE = [
  { value: '2025', label: 'Established' },
  { value: '2025', label: 'Launched' },
  { value: 'JKUAT students', label: 'Who can join?' },
  { value: 'Student-led', label: 'Projects' },
  { value: 'Learn by doing', label: 'Our approach' },
];

const HERO_SLIDES = [
  { src: '/uploads/iec-07.jpg' },
  { src: '/uploads/iec-04.jpg' },
  { src: '/uploads/iec-01.jpg' },
  { src: '/uploads/iec-12.jpg' },
  { src: '/uploads/iec-14.jpg' },
  { src: '/uploads/iec-16.jpg' },
];

function HeroSection() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    motionPreference.addEventListener('change', updatePreference);
    return () => motionPreference.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    if (reducedMotion) return undefined;
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % HERO_SLIDES.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [reducedMotion]);

  return (
    <section className="home-hero">
      <div className="home-hero-backdrop" aria-hidden="true">
        {HERO_SLIDES.map((slide, index) => (
          <img
            key={slide.src}
            className={index === activeSlide ? 'is-active' : ''}
            src={slide.src}
            alt=""
            loading={index === 0 ? 'eager' : 'lazy'}
            decoding="async"
          />
        ))}
      </div>
      <div className="home-hero-shade" aria-hidden="true" />
      <div className="home-hero-copy">
        <p className="section-label">IEC JKUAT</p>
        <h1>Ideas are everywhere.<br /><span>Let’s build them.</span></h1>
        <p className="home-hero-intro">
          A student-led community for learning by doing, building with others and bringing useful ideas to life.
        </p>
        <div className="home-hero-actions">
          <a href="#join" className="btn-primary home-hero-cta">Become a member <FiArrowRight aria-hidden="true" /></a>
          <a href="#what-we-do" className="home-text-link">Explore the club <FiArrowUpRight aria-hidden="true" /></a>
        </div>
      </div>
    </section>
  );
}

function AtAGlanceSection() {
  return (
    <section className="home-glance" aria-label="IEC JKUAT at a glance">
      <dl className="home-glance-grid">
        {AT_A_GLANCE.map((fact) => (
          <div key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function WhatIsSection() {
  return (
    <section id="about" className="home-section home-about">
      <div className="home-section-heading">
        <p className="section-label">About IEC JKUAT</p>
        <h2>A place to turn curiosity into action.</h2>
      </div>
      <div className="home-about-content">
        <p>
          The Innovation and Entrepreneurship Club brings JKUAT students together to explore problems, test ideas and learn how to build solutions that matter.
        </p>
        <div>
          <p>We make space for students from every course and year to share skills, find collaborators and learn through real projects.</p>
          <Link to="/about#team" className="home-text-link">Meet the leadership <FiArrowRight aria-hidden="true" /></Link>
        </div>
        <figure className="home-about-image photo-overlay-container">
          <img loading="lazy" src="/uploads/iec.jpeg" alt="IEC members and mentors at a club event" />
          <figcaption className="photo-reveal">
            <strong>Students, mentors and partners</strong>
            <span>Building useful ideas together.</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

function WhatWeDoSection() {
  return (
    <section id="what-we-do" className="home-section home-what-we-do">
      <div className="home-section-heading">
        <p className="section-label">What we do</p>
        <h2>Learn by making things happen.</h2>
        <p>Practical ways to explore innovation and entrepreneurship while you study.</p>
      </div>
      <div className="home-activity-grid">
        {DO_CARDS.map(({ n, icon: Icon, photo, title, text }) => (
          <article key={n} className="home-activity-card" data-reveal="up">
            <div className="home-activity-image photo-overlay-container">
              <img loading="lazy" src={`/uploads/${photo}`} alt="" />
              <div className="photo-reveal">
                <strong>{title}</strong>
                <span>{text}</span>
              </div>
            </div>
            <div className="home-activity-copy">
              <Icon aria-hidden="true" />
              <span>{n}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PhotoGallery() {
  const photos = [
    { src: 'iec-12.jpg', title: 'The IEC community', text: 'Students and guests sharing a club gathering.', alt: 'IEC JKUAT members and guests at a club gathering' },
    { src: 'iec-14.jpg', title: 'Learning together', text: 'Students and mentors exchanging ideas.', alt: 'IEC students and mentors together at an event' },
    { src: 'iec-16.jpg', title: 'Campus events', text: 'Students representing the club at JKUAT.', alt: 'Students representing IEC JKUAT at a campus event' },
    { src: 'iec-18.jpg', title: 'Shared moments', text: 'The community behind every activity.', alt: 'IEC JKUAT community sharing a moment after an activity' },
    { src: 'iec-03.jpg', title: 'Working together', text: 'Members collaborating on club activities.', alt: 'IEC members collaborating during a club activity' },
    { src: 'iec-05.jpg', title: 'Making connections', text: 'Students finding collaborators and support.', alt: 'Students connecting through IEC JKUAT' },
  ];
  return (
    <section className="home-photo-gallery" aria-labelledby="home-photo-gallery-heading">
      <p className="section-label" id="home-photo-gallery-heading">Our community</p>
      <div className="home-photo-gallery-track">
        {[false, true].map((duplicate) => (
          <div
            className="home-photo-gallery-group"
            key={duplicate ? 'duplicate' : 'gallery'}
            aria-hidden={duplicate}
          >
            {photos.map((photo) => (
              <figure className="home-photo-gallery-item photo-overlay-container" key={photo.src}>
                <img loading="lazy" src={`/uploads/${photo.src}`} alt={duplicate ? '' : photo.alt} />
                <figcaption className="photo-reveal">
                  <strong>{photo.title}</strong>
                  <span>{photo.text}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function JourneySection() {
  return (
    <section className="home-section home-journey">
      <div className="home-section-heading">
        <p className="section-label">How we work</p>
        <h2>From first question to first version.</h2>
      </div>
      <div className="home-journey-grid">
        {JOURNEY.map((step) => (
          <article key={step.n} className="home-journey-step">
            <span>{step.n}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function WhoCanJoinSection() {
  return (
    <section className="home-section home-welcome">
      <div className="home-welcome-copy">
        <p className="section-label">Who can join?</p>
        <h2>Every discipline.<br /><span>Every starting point.</span></h2>
        <p>Designers, engineers, business students and curious beginners all bring something different to the table.</p>
        <div className="home-discipline-list">
          {DISCIPLINES.map((discipline) => <span key={discipline}>{discipline}</span>)}
        </div>
      </div>
      <figure className="home-welcome-image photo-overlay-container">
        <img loading="lazy" src="/uploads/iec-01.jpg" alt="IEC members talking with students at a campus recruitment event" />
        <figcaption className="photo-reveal">
          <strong>Every discipline belongs</strong>
          <span>Bring a different perspective and find a team to build with.</span>
        </figcaption>
      </figure>
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
    <section className="home-section home-events">
      <div className="home-events-heading">
        <div className="home-section-heading">
          <p className="section-label">On the calendar</p>
          <h2>Upcoming events</h2>
        </div>
        <Link to="/events" className="home-text-link">View all events <FiArrowRight aria-hidden="true" /></Link>
      </div>

        {events === null && !failed ? (
          <div className="home-event-empty">
            <p>Loading events…</p>
          </div>
        ) : failed ? (
          <p className="home-event-empty" role="status">Could not load events.</p>
        ) : events && events.length === 0 ? (
          <div className="home-event-empty">
            <p>No events scheduled yet. Check back soon.</p>
          </div>
        ) : (
          <div className="home-event-list">
            {events!.map((ev) => {
              const d = new Date(ev.event_date);
              const validDate = !isNaN(d.getTime());
              const cat = (ev.category || '').toLowerCase();
              const col = CAT_COLORS[cat] || 'text-iec-blue';
              return (
                <Link key={ev.id} to={`/event?id=${ev.id}`} className="home-event-card">
                  <div className="home-event-date">
                    <span>{validDate ? d.getDate() : '—'}</span>
                    <small>{validDate ? MONTHS[d.getMonth()] : ''}</small>
                  </div>
                  <div className="home-event-copy">
                    <h3>{ev.title}</h3>
                    <div className="home-event-meta">
                      {ev.category && <span className={col}>{ev.category}</span>}
                      {ev.location && <span><FiMapPin aria-hidden="true" />{ev.location}</span>}
                    </div>
                  </div>
                  <FiArrowUpRight className="home-event-arrow" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        )}
    </section>
  );
}

function BenefitsSection() {
  return (
    <section className="home-section home-benefits">
      <div className="home-section-heading">
        <p className="section-label">Why join</p>
        <h2>Make your time at JKUAT count.</h2>
      </div>
      <div className="home-benefit-grid">
        {BENEFITS.map(({ icon: Icon, title, text }) => (
          <article key={title} className="home-benefit-card" data-reveal="up">
            <Icon aria-hidden="true" />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function IdeaSection() {
  return (
    <section className="home-join-prompt">
      <div>
        <p className="section-label">Start where you are</p>
        <h2>Bring a question.<br />Leave with a next step.</h2>
        <p>You don’t need a finished business plan. Bring your curiosity and we’ll help you find a way to get involved.</p>
      </div>
      <a href="#join" className="btn-primary">Join the club <FiArrowRight aria-hidden="true" /></a>
    </section>
  );
}

const PARTNERSHIP_ROUTES = [
  { icon: FiUsers, title: 'Mentor a team', text: 'Share practical experience with students developing an idea or early-stage project.' },
  { icon: FiLayers, title: 'Bring a challenge', text: 'Introduce a real problem students can explore through workshops and projects.' },
  { icon: FiCompass, title: 'Create opportunities', text: 'Help make showcases, learning sessions and new collaborations possible.' },
];

function PartnersSection() {
  return (
    <section className="home-partners" aria-labelledby="home-partners-title">
      <div className="home-partners-heading">
        <div>
          <p className="section-label">Partners &amp; collaborators</p>
          <h2 id="home-partners-title">Good ideas grow stronger together.</h2>
          <p>Work with IEC to help students turn curiosity into useful projects and new possibilities.</p>
        </div>
        <Link to="/contact" className="home-partners-cta">Partner with IEC <FiArrowRight aria-hidden="true" /></Link>
      </div>
      <div className="home-partners-grid">
        {PARTNERSHIP_ROUTES.map(({ icon: Icon, title, text }) => (
          <article className="home-partner-card" key={title}>
            <Icon aria-hidden="true" />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
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
  const [regErrors, setRegErrors] = useState<Partial<Record<keyof typeof reg, string>>>({});
  const [regBusy, setRegBusy] = useState(false);

  const [payReg, setPayReg] = useState('');
  const [payPhone, setPayPhone] = useState('');
  const [payBusy, setPayBusy] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [payErrors, setPayErrors] = useState<{ reg?: string; phone?: string }>({});
  const [status, setStatus] = useState<{ ok: boolean; ref?: string; error?: string } | null>(null);

  const setRegField = (key: keyof typeof reg) => (event: { target: { value: string } }) => {
    setReg((current) => ({ ...current, [key]: event.target.value }));
    setRegErrors((current) => ({ ...current, [key]: undefined }));
  };

  async function handleRegistration(e: FormEvent) {
    e.preventDefault();
    const errors = {
      fullName: validatePersonName(reg.fullName, 'Full name'),
      regNumber: validateRegistrationNumber(reg.regNumber),
      college: reg.college ? undefined : 'Choose your college.',
      course: validateRequiredText(reg.course, 'Course', 2, 100),
      yearOfStudy: ['1', '2', '3', '4', '5', '6'].includes(reg.yearOfStudy) ? undefined : 'Choose your year of study.',
      phone: validateKenyanPhone(reg.phone),
      email: validateEmail(reg.email),
    };
    setRegErrors(errors);
    if (Object.values(errors).some(Boolean)) return;
    const normalizedPhone = normalizeKenyanPhone(reg.phone);
    if (!normalizedPhone) return;
    setRegBusy(true);
    try {
      const data = await submitMemberRegistration({
        fullName: reg.fullName.trim(),
        regNumber: reg.regNumber.trim(),
        college: reg.college,
        course: reg.course.trim(),
        yearOfStudy: reg.yearOfStudy,
        phone: normalizedPhone,
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
    const regError = validateRegistrationNumber(payReg);
    if (regError) {
      setPayErrors((current) => ({ ...current, reg: regError }));
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
    const errors = { reg: validateRegistrationNumber(payReg), phone: validateKenyanPhone(payPhone) };
    setPayErrors(errors);
    if (Object.values(errors).some(Boolean)) return;
    const normalizedPhone = normalizeKenyanPhone(payPhone);
    if (!normalizedPhone) return;
    // Pay directly without pressing Find: look the member up once here.
    const id = memberId ?? (await lookupMember());
    if (!id) return;
    setPayBusy(true);
    setStatus(null);
    try {
      const result = (await initiatePayment(normalizedPhone, 200, id)) as { transactionRef?: string };
      setStatus({ ok: true, ref: result?.transactionRef });
      setMemberId(null);
    } catch (err) {
      setStatus({ ok: false, error: (err as Error).message });
    } finally {
      setPayBusy(false);
    }
  }

  return (
    <section className="home-section home-membership" id="join">
      <div className="home-membership-layout">
        <div className="home-membership-intro">
          <p className="section-label">Membership</p>
          <h2>Make room for what you can build.</h2>
          <p>Open to all JKUAT students. Register once, then activate your membership online.</p>
          <ul className="home-membership-checklist">
            <li><FiCheck aria-hidden="true" />Meet students who want to make things happen</li>
            <li><FiCheck aria-hidden="true" />Join workshops, projects and club activities</li>
            <li><FiCheck aria-hidden="true" />Start with an idea—or a willingness to learn</li>
          </ul>
          <p className="home-membership-help">Already registered? Choose <strong>Membership activation</strong> to continue.</p>
        </div>

        <div className="home-membership-form">
          <div className="membership-form-card">
            <div className="home-membership-tabs" role="group" aria-label="Membership steps">
              <button type="button" aria-pressed={step === 1} className={`step-tab ${step === 1 ? 'active' : ''}`} onClick={() => setStep(1)}>
                <span>01</span> Registration
              </button>
              <button type="button" aria-pressed={step === 2} className={`step-tab ${step === 2 ? 'active' : ''}`} onClick={() => setStep(2)}>
                <span>02</span> Activation
              </button>
            </div>

            {step === 1 ? (
              <div className="membership-form-panel">
                <div className="membership-form-heading">
                  <h3>Tell us a little about you.</h3>
                  <p>Your JKUAT details help us set up your membership.</p>
                </div>
                <form noValidate className="membership-fields grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleRegistration}>
                  <div className="md:col-span-2">
                    <label className="block text-[13px] font-medium text-white/60 mb-1.5" htmlFor="member-full-name">Full name *</label>
                    <input id="member-full-name" aria-invalid={Boolean(regErrors.fullName)} aria-describedby={regErrors.fullName ? 'member-full-name-error' : undefined} className="iec-input" placeholder="Jane Mwangi" required type="text" maxLength={120} value={reg.fullName} onChange={setRegField('fullName')} />
                    <FieldError id="member-full-name-error" message={regErrors.fullName} />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-white/60 mb-1.5" htmlFor="member-reg-number">Registration number *</label>
                    <input id="member-reg-number" aria-invalid={Boolean(regErrors.regNumber)} aria-describedby={regErrors.regNumber ? 'member-reg-number-error' : undefined} className="iec-input" placeholder="SCT211-XXXX/20XX" required type="text" maxLength={50} value={reg.regNumber} onChange={setRegField('regNumber')} />
                    <FieldError id="member-reg-number-error" message={regErrors.regNumber} />
                  </div>
                  <CustomSelect id="member-college" label="College *" value={reg.college} options={['COPAS', 'COETEC', 'COHES', 'COANRE', 'COHRED']} placeholder="Select college" error={regErrors.college} onChange={(value) => {
                    setReg((current) => ({ ...current, college: value }));
                    setRegErrors((current) => ({ ...current, college: undefined }));
                  }} />
                  <div>
                    <label className="block text-[13px] font-medium text-white/60 mb-1.5" htmlFor="member-course">Course *</label>
                    <input id="member-course" aria-invalid={Boolean(regErrors.course)} aria-describedby={regErrors.course ? 'member-course-error' : undefined} className="iec-input" placeholder="e.g. BSc Computer Science" required type="text" maxLength={100} value={reg.course} onChange={setRegField('course')} />
                    <FieldError id="member-course-error" message={regErrors.course} />
                  </div>
                  <CustomSelect id="member-year" label="Year of study *" value={reg.yearOfStudy} options={['1', '2', '3', '4', '5', '6']} placeholder="Select year" error={regErrors.yearOfStudy} onChange={(value) => {
                    setReg((current) => ({ ...current, yearOfStudy: value }));
                    setRegErrors((current) => ({ ...current, yearOfStudy: undefined }));
                  }} />
                  <div>
                    <label className="block text-[13px] font-medium text-white/60 mb-1.5" htmlFor="member-phone">Phone number *</label>
                    <input id="member-phone" aria-invalid={Boolean(regErrors.phone)} aria-describedby={regErrors.phone ? 'member-phone-error' : undefined} className="iec-input" placeholder="07XXXXXXXX" required type="tel" maxLength={16} value={reg.phone} onChange={setRegField('phone')} />
                    <FieldError id="member-phone-error" message={regErrors.phone} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[13px] font-medium text-white/60 mb-1.5" htmlFor="member-email">JKUAT Email *</label>
                    <input id="member-email" aria-invalid={Boolean(regErrors.email)} aria-describedby={regErrors.email ? 'member-email-error' : undefined} className="iec-input" placeholder="user@students.jkuat.ac.ke" required type="email" maxLength={254} value={reg.email} onChange={setRegField('email')} />
                    <FieldError id="member-email-error" message={regErrors.email} />
                  </div>
                  <div className="md:col-span-2 mt-2">
                    <button className="btn-primary w-full justify-center" type="submit" disabled={regBusy}>
                      {regBusy ? (
                        'Registering…'
                      ) : (
                        <>Continue to activation <FiArrowRight aria-hidden="true" /></>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="membership-form-panel">
                <div className="text-center mb-8">
                  <div className="membership-payment-icon">
                    <FiCreditCard aria-hidden="true" />
                  </div>
                  <h3 className="font-display font-bold text-white text-xl mb-1">Activate membership</h3>
                  <p className="text-white/40 text-sm">Complete your membership activation securely using M‑Pesa.</p>
                </div>
                <form noValidate className="membership-payment-fields" onSubmit={handlePayment}>
                  <div>
                    <label className="block text-[13px] font-medium text-white/60 mb-1.5" htmlFor="activation-reg-number">Registration number *</label>
                    <div className="membership-registration-row">
                      <input
                        id="activation-reg-number"
                        className="iec-input flex-1"
                        placeholder="SCT211-XXXX/20XX"
                        required
                        type="text"
                        maxLength={50}
                        aria-invalid={Boolean(payErrors.reg)}
                        aria-describedby={payErrors.reg ? 'payment-reg-error' : undefined}
                        value={payReg}
                        onChange={(e) => {
                          // A looked-up member belongs to the old value; never pay for them by mistake.
                          setPayReg(e.target.value);
                          setPayErrors((current) => ({ ...current, reg: undefined }));
                          setMemberId(null);
                          setPreview(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={lookupMember}
                        disabled={lookupBusy}
                        className="membership-find-button"
                        style={{ border: '1px solid rgba(0,174,239,0.4)' }}
                      >
                        {lookupBusy ? 'Finding…' : 'Find member'}
                      </button>
                    </div>
                    <FieldError id="payment-reg-error" message={payErrors.reg} />
                    <p className="text-white/40 text-xs mt-1.5">We’ll confirm your membership before sending the payment prompt.</p>
                  </div>

                  {preview && (
                    <div className="membership-preview">
                      <FiUsers className="membership-preview-icon" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{preview.full_name || '—'}</p>
                        <p className="text-white/40 text-xs truncate">{preview.reg_number || '—'}</p>
                      </div>
                      <FiCheck className="membership-preview-check" aria-hidden="true" />
                    </div>
                  )}

                  <div className="membership-amount">
                    <span className="text-white/35 text-xs uppercase tracking-widest">Amount due</span>
                    <span className="font-display font-extrabold text-iec-blue text-2xl">KES 200</span>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-white/60 mb-1.5">M‑Pesa number *</label>
                    <input id="payment-phone" aria-invalid={Boolean(payErrors.phone)} aria-describedby={payErrors.phone ? 'payment-phone-error' : undefined} className="iec-input" placeholder="07XXXXXXXX" required type="tel" maxLength={16} value={payPhone} onChange={(e) => {
                      setPayPhone(e.target.value);
                      setPayErrors((current) => ({ ...current, phone: undefined }));
                    }} />
                    <FieldError id="payment-phone-error" message={payErrors.phone} />
                    <p className="text-white/40 text-xs mt-1.5">Use any Safaricom number that can receive an M‑Pesa prompt.</p>
                  </div>

                  <button className="btn-primary w-full justify-center" type="submit" disabled={payBusy}>
                    {payBusy ? (
                    'Sending payment request…'
                    ) : (
                    <>Pay securely with M‑Pesa <FiArrowRight aria-hidden="true" /></>
                    )}
                  </button>
                </form>

                {status && (
                  <div className={`membership-status ${status.ok ? 'is-success' : 'is-error'}`}>
                    {status.ok ? (
                      <>
                        <div className="membership-status-success">
                          <FiCheck aria-hidden="true" />
                          STK Push sent!
                        </div>
                        <p>Check your phone for the M‑Pesa prompt and enter your PIN.</p>
                        <p>Reference: {status.ref || '—'}</p>
                      </>
                    ) : (
                      <>
                        <div className="membership-status-error">
                          <FiAlertCircle aria-hidden="true" />
                          Payment failed
                        </div>
                        <p>{status.error}</p>
                      </>
                    )}
                  </div>
                )}

                <p className="membership-register-link">
                  <button type="button" onClick={() => setStep(1)}>
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

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} className="field-error" role="alert">{message}</p>;
}
