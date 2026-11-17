import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiArrowUpRight, FiCompass, FiLayers, FiUsers } from 'react-icons/fi';
import { supabase } from '../lib/supabase';

type LeadershipLevel = 'advisor' | 'executive' | 'lead';

interface LeadershipProfile {
  id: string;
  name: string;
  role: string;
  level: LeadershipLevel;
  photo: string | null;
  description: string;
  responsibilities: string;
}

interface LeadershipRecord {
  id: string;
  name: string;
  role: string;
  level: string;
  photo_path: string | null;
  description: string;
  responsibilities: string;
}

const PILLARS = [
  { icon: FiCompass, title: 'Find the opportunity', text: 'Start with real problems on campus and in our communities.' },
  { icon: FiLayers, title: 'Build with purpose', text: 'Turn promising questions into prototypes, ventures and useful work.' },
  { icon: FiUsers, title: 'Grow together', text: 'Learn across disciplines with peers, mentors and the wider JKUAT community.' },
];

const CORE_VALUES = [
  { title: 'Innovation', text: 'We help ideas move from curiosity to practical solutions.' },
  { title: 'Collaboration', text: 'We learn across disciplines and build stronger work together.' },
  { title: 'Integrity', text: 'We act with honesty, respect and responsibility.' },
  { title: 'Impact', text: 'We focus on useful work that responds to real community needs.' },
];

export default function About() {
  const [profiles, setProfiles] = useState<LeadershipProfile[] | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('executives')
          .select('id, name, role, level, photo_path, description, responsibilities')
          .eq('is_active', true)
          .order('display_order', { ascending: true });
        if (!active) return;
        if (error) {
          console.error('Could not load leadership profiles:', error.message);
          setLoadError('Leadership profiles are temporarily unavailable.');
          return;
        }
        const valid: LeadershipProfile[] = [];
        for (const record of (data ?? []) as LeadershipRecord[]) {
          if (record.level !== 'advisor' && record.level !== 'executive' && record.level !== 'lead') continue;
          const name = record.name.trim();
          const description = record.description.trim();
          const responsibilities = record.responsibilities.trim();
          if (!name || !description || !responsibilities) continue;
          valid.push({
            id: record.id,
            name,
            role: record.role,
            level: record.level,
            photo: record.photo_path
              ? supabase.storage.from('iec-executive-profiles').getPublicUrl(record.photo_path).data.publicUrl
              : null,
            description,
            responsibilities,
          });
        }
        setProfiles(valid);
      } catch (requestError: unknown) {
        if (!active) return;
        console.error('Could not load leadership profiles:', requestError);
        setLoadError('Leadership profiles are temporarily unavailable.');
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <main className="about-page">
      <section className="about-hero">
        <div className="about-hero-copy">
          <p className="about-kicker">INNOVATION &amp; ENTREPRENEURSHIP CLUB · JKUAT</p>
          <h1>Good ideas move forward <span>together.</span></h1>
          <p className="about-lede">
            We bring students together to discover opportunities, build practical solutions and learn from the people around us.
          </p>
          <div className="about-hero-links">
            <Link to="/#join" className="about-primary-link">Find your place at IEC <FiArrowRight aria-hidden="true" /></Link>
            <a href="#team" className="about-secondary-link">Meet our people <FiArrowUpRight aria-hidden="true" /></a>
          </div>
          <div className="about-hero-note"><span>JKUAT Main Campus</span><i /> Student-led · Open to every discipline</div>
        </div>
        <figure className="about-hero-photo photo-overlay-container">
          <img src="/uploads/iec-01.jpg" alt="IEC JKUAT students sharing ideas at a club activity" />
          <figcaption className="photo-reveal"><strong>Curiosity becomes momentum.</strong><span>Ideas are better when we build them together.</span></figcaption>
        </figure>
      </section>

      <section className="about-story">
        <div className="about-story-heading">
          <p className="about-kicker">A COMMUNITY FOR MAKING</p>
          <h2>Innovation is a team sport.</h2>
        </div>
        <div className="about-story-copy">
          <p>IEC JKUAT is a student-led community for people who are curious about how ideas become useful things. You do not need a finished plan or a particular course to begin.</p>
          <p>Bring a question, a skill, or simply the willingness to try. Find collaborators, learn through practical projects and take the next step with a community behind you.</p>
        </div>
      </section>

      <section className="about-purpose-grid" aria-label="Our vision and mission">
        <article className="about-purpose-card">
          <h2>Our Vision</h2>
          <p>To be the leading catalyst for innovation in Africa, where ideas thrive, solutions scale, and lives are transformed.</p>
        </article>
        <article className="about-purpose-card">
          <h2>Our Mission</h2>
          <p>To nurture innovation by providing a dynamic ecosystem that bridges the gap between creativity and opportunity, fostering collaboration, and driving change.</p>
        </article>
      </section>

      <section className="about-values" aria-labelledby="about-values-title">
        <div className="about-values-heading">
          <p className="about-kicker">What guides us</p>
          <h2 id="about-values-title">Our Core Values</h2>
        </div>
        <div className="about-values-grid">
          {CORE_VALUES.map(({ title, text }, index) => (
            <article className="about-value-card" key={title}>
              <span>0{index + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-pillars" aria-label="How IEC helps students">
        {PILLARS.map(({ icon: Icon, title, text }, index) => (
          <article className="about-pillar" key={title}>
            <span className="about-pillar-number">0{index + 1}</span>
            <Icon aria-hidden="true" />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section id="team" className="about-people">
        <div className="about-people-heading">
          <p>PEOPLE WHO MAKE IT HAPPEN</p>
          <h2>Our People</h2>
          <span>Meet the advisors, executive committee and portfolio leads guiding IEC JKUAT.</span>
        </div>
        {loadError ? (
          <div className="about-team-state" role="status">{loadError} Please try again later.</div>
        ) : profiles === null ? (
          <div className="about-team-state" role="status">Loading leadership profiles…</div>
        ) : profiles.length === 0 ? (
          <div className="about-team-state">Leadership profiles will be shared here soon.</div>
        ) : (
          <div className="about-people-grid">
            {profiles.map((person) => (
              <article className="about-person-card" key={person.id}>
                <div className="about-person-photo">
                  <LeadershipPortrait person={person} />
                </div>
                <div className="about-person-copy">
                  <span className="about-person-level">{person.role}</span>
                  <h3>{person.name}</h3>
                  <p className="about-person-description">{person.description}</p>
                  <details className="about-person-responsibilities">
                    <summary>
                      <strong>What they do</strong>
                      <span>{person.responsibilities}</span>
                    </summary>
                    <p>{person.responsibilities}</p>
                  </details>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="about-bottom-cta">
        <div><p className="about-kicker">YOUR NEXT STEP STARTS HERE</p><h2>Bring your curiosity.<br />We’ll build from there.</h2></div>
        <Link to="/#join" className="about-primary-link">Become a member <FiArrowRight aria-hidden="true" /></Link>
      </section>
    </main>
  );
}

function LeadershipPortrait({ person }: { person: LeadershipProfile }) {
  const [src, setSrc] = useState(person.photo);

  useEffect(() => {
    setSrc(person.photo);
  }, [person.photo]);

  function handleImageError() {
    setSrc(null);
  }

  return src
    ? <img loading="lazy" src={src} alt={`${person.name} portrait`} onError={handleImageError} />
    : <span aria-hidden="true">{person.name.slice(0, 1).toUpperCase()}</span>;
}
