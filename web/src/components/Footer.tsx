import { Link } from 'react-router-dom';
import { FaEnvelope, FaLocationDot } from 'react-icons/fa6';
import { FiArrowRight } from 'react-icons/fi';
import ClubLogo from './ClubLogo';
import { CLUB_SOCIAL_LINKS } from './SocialIcons';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-cta">
        <div className="site-footer-cta-copy">
          <p className="site-footer-eyebrow">Ideas are better built together</p>
          <h2>Make something meaningful with IEC.</h2>
        </div>
        <div className="site-footer-cta-actions">
          <Link to="/#join" className="site-footer-cta-primary">Join the club <FiArrowRight aria-hidden="true" /></Link>
          <Link to="/contact" className="site-footer-cta-secondary">Partner with us</Link>
        </div>
      </div>
      <div className="site-footer-main">
        <div className="site-footer-brand">
          <Link to="/" className="site-brand" aria-label="IEC JKUAT home">
            <ClubLogo className="site-brand-mark site-brand-mark-footer" />
            <span className="site-brand-copy">
              <strong>IEC</strong>
              <small>Innovation and Entrepreneurship<br />Club • JKUAT</small>
            </span>
          </Link>
          <p>A student community at JKUAT for turning ideas into practical projects and ventures.</p>
          <div className="site-social-links">
            {CLUB_SOCIAL_LINKS.map(({ label, href, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
                <Icon aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>

        <div className="site-footer-column">
          <h2>Explore</h2>
          <Link to="/about">About the club</Link>
          <Link to="/products">Products</Link>
          <Link to="/events">Events</Link>
          <Link to="/showcase">Innovations</Link>
          <Link to="/blog">Blog</Link>
        </div>

        <div className="site-footer-column">
          <h2>Get involved</h2>
          <Link to="/#join">Become a member</Link>
          <Link to="/contact">Contact IEC</Link>
        </div>

        <div className="site-footer-column site-footer-contact">
          <h2>Find us</h2>
          <p><FaLocationDot aria-hidden="true" /> JKUAT Main Campus, Kiambu</p>
          <a href="mailto:info@iecjkuat.com"><FaEnvelope aria-hidden="true" /> info@iecjkuat.com</a>
        </div>
      </div>
      <div className="site-footer-bottom">
        <p>Copyright © {new Date().getFullYear()} IEC JKUAT | Innovation &amp; Entrepreneurship Club</p>
        <div><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></div>
      </div>
    </footer>
  );
}
