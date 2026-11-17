import { Link } from 'react-router-dom';
import { FiArrowRight, FiBookOpen, FiCompass, FiLayers, FiUsers } from 'react-icons/fi';

const ACTIVITIES = [
  {
    number: '01',
    category: 'Learn',
    title: 'Build practical skills',
    description: 'Take part in workshops, founder talks and peer sessions that turn useful knowledge into confidence.',
    image: '/uploads/iec-08.jpg',
    icon: FiBookOpen,
  },
  {
    number: '02',
    category: 'Explore',
    title: 'Find the right problem',
    description: 'Explore campus and community challenges, then test assumptions with the people closest to them.',
    image: '/uploads/iec-03.jpg',
    icon: FiCompass,
  },
  {
    number: '03',
    category: 'Build',
    title: 'Make ideas tangible',
    description: 'Join a team, shape an early concept and move it forward through prototypes and practical projects.',
    image: '/uploads/iec-07.jpg',
    icon: FiLayers,
  },
  {
    number: '04',
    category: 'Connect',
    title: 'Grow with a community',
    description: 'Meet collaborators across JKUAT, share what you know and find support for your next step.',
    image: '/uploads/iec-14.jpg',
    icon: FiUsers,
  },
];

export default function Activities() {
  return (
    <main className="activities-page">
      <section className="catalog-hero activities-hero">
        <div className="catalog-hero-copy">
          <p className="section-label">Learn · Explore · Build · Connect</p>
          <h1>Make space for your next idea.</h1>
          <p>
            IEC activities help JKUAT students move from curiosity to practical experience—one skill, collaboration and
            experiment at a time.
          </p>
          <Link to="/#join" className="catalog-hero-action">Find your place <FiArrowRight aria-hidden="true" /></Link>
        </div>
        <figure className="catalog-hero-image photo-overlay-container">
          <img src="/uploads/iec-01.jpg" alt="IEC JKUAT students working together at a club activity" />
          <figcaption className="photo-reveal"><strong>Open to every discipline</strong><span>Good work starts together.</span></figcaption>
        </figure>
      </section>

      <section className="catalog-section activities-section" aria-labelledby="activities-heading">
        <div className="catalog-section-heading">
          <div>
            <p className="section-label">How we get involved</p>
            <h2 id="activities-heading">A place to start. Room to grow.</h2>
          </div>
          <p>Pick up a skill, join a team or bring a challenge you want to understand better.</p>
        </div>
        <div className="activity-catalog-grid">
          {ACTIVITIES.map(({ number, category, title, description, image, icon: Icon }) => (
            <article className="activity-catalog-card" key={number}>
              <div className="activity-catalog-image photo-overlay-container">
                <img src={image} alt="" loading="lazy" />
                <span>{category}</span>
                <div className="photo-reveal">
                  <strong>{title}</strong>
                  <span>{description}</span>
                </div>
              </div>
              <div className="activity-catalog-copy">
                <div className="activity-catalog-meta"><Icon aria-hidden="true" /><span>{number}</span></div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="catalog-cta">
        <div>
          <p className="section-label">Start where you are</p>
          <h2>You don’t need a finished plan to join in.</h2>
        </div>
        <Link to="/#join" className="catalog-hero-action">Become a member <FiArrowRight aria-hidden="true" /></Link>
      </section>
    </main>
  );
}
