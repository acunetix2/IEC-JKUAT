import { Link } from 'react-router-dom';
import { FiArrowRight, FiBookOpen } from 'react-icons/fi';
import PhotoSlideshow from '../components/PhotoSlideshow';

export default function Blog() {
  return (
    <main className="catalog-page blog-page">
      <section className="catalog-hero blog-hero">
        <div className="catalog-hero-copy">
          <p className="section-label">Blog · IEC JKUAT</p>
          <h1>Ideas, lessons, and progress worth sharing.</h1>
          <p>
            Notes from the people building, learning and exploring new possibilities in our community.
          </p>
          <Link to="/showcase" className="catalog-hero-action">
            Explore innovations <FiArrowRight aria-hidden="true" />
          </Link>
        </div>
        <figure className="catalog-hero-image photo-overlay-container catalog-hero-slideshow">
          <PhotoSlideshow images={['/uploads/iec-03.jpg', '/uploads/iec-14.jpg', '/uploads/iec-01.jpg', '/uploads/iec-16.jpg']} />
          <figcaption className="photo-reveal">
            <strong>Ideas grow when shared</strong>
            <span>Stories from the IEC community.</span>
          </figcaption>
        </figure>
      </section>

      <section className="catalog-section blog-section" aria-labelledby="blog-heading">
        <div className="catalog-section-heading">
          <div>
            <p className="section-label">From our community</p>
            <h2 id="blog-heading">The IEC blog</h2>
          </div>
          <p>Experiences and perspectives from across our innovation community.</p>
        </div>
        <div className="catalog-empty-state blog-empty-state">
          <FiBookOpen aria-hidden="true" />
          <h3>No stories published yet</h3>
          <p>We’re preparing the first stories from IEC JKUAT. Check back soon.</p>
        </div>
      </section>
    </main>
  );
}
