// IEC JKUAT — Project showcase. Ported from showcase.html + showcase.js.
// Fetches projects via getProjects(), renders a filterable project-card grid,
// and links students to the membership form.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiArrowUpRight } from 'react-icons/fi';
import PhotoSlideshow from '../components/PhotoSlideshow';
import { getProjects } from '../lib/supabase';
import { parseMediaUrls, isPreviewImage, PROJECT_FALLBACK_IMG } from '../lib/media';
import type { Project } from '../types/db';

const FILTERS = [
  { category: 'all', label: 'All' },
  { category: 'fintech', label: 'Fintech' },
  { category: 'agtech', label: 'AgTech' },
  { category: 'healthtech', label: 'HealthTech' },
  { category: 'social', label: 'Social Impact' },
];

function catKey(category?: string): string {
  return (category || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export default function Showcase() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let active = true;
    getProjects()
      .then((data) => {
        if (active) setProjects(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load projects');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(
    () => (filter === 'all' ? projects : projects.filter((p) => catKey(p.category) === filter)),
    [projects, filter]
  );

  return (
    <main className="catalog-page projects-page">
      <section className="catalog-hero projects-hero">
        <div className="catalog-hero-copy">
          <p className="section-label">Innovations · JKUAT</p>
          <h1>Student ideas, built into something real.</h1>
          <p>Meet the teams turning questions into prototypes, ventures and useful work across our community.</p>
          <div className="catalog-hero-details">
            <span><strong>{projects.length}</strong> projects shared</span>
            <Link to="/activities" className="catalog-hero-action">How we build <FiArrowRight aria-hidden="true" /></Link>
          </div>
        </div>
        <figure className="catalog-hero-image photo-overlay-container catalog-hero-slideshow">
          <PhotoSlideshow images={['/uploads/iec-08.jpg', '/uploads/iec-07.jpg', '/uploads/iec-04.jpg', '/uploads/iec-12.jpg']} />
          <figcaption className="photo-reveal"><strong>Make it, test it, learn</strong><span>Every project starts somewhere.</span></figcaption>
        </figure>
      </section>

      <section className="catalog-section projects-section" aria-labelledby="projects-heading">
        <div className="catalog-section-heading">
          <div>
            <p className="section-label">The showcase</p>
            <h2 id="projects-heading">Innovations from our community</h2>
          </div>
          <p>Filter by area to explore the work taking shape at IEC.</p>
        </div>
        <div className="catalog-filter-row" id="project-filters" role="group" aria-label="Filter projects by category">
          {FILTERS.map((f) => (
            <button
              key={f.category}
              className={`filter-btn ${filter === f.category ? 'active' : ''}`}
              aria-pressed={filter === f.category}
              onClick={() => setFilter(f.category)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="catalog-result-count">{filtered.length} {filtered.length === 1 ? 'project' : 'projects'}</p>
        <div className="project-catalog-grid">
          {loading ? (
            <div className="catalog-empty-state">
              <span className="material-symbols-outlined animate-spin" aria-hidden="true">sync</span>
              <p>Loading projects...</p>
            </div>
          ) : error ? (
            <p className="catalog-empty-state" role="alert">Failed to load projects: {error}</p>
          ) : filtered.length === 0 ? (
            <div className="catalog-empty-state">
              <span className="material-symbols-outlined" aria-hidden="true">rocket_launch</span>
              <p>No projects in this area yet. Check back as our teams share their work.</p>
              <Link to="/#join">Bring us your idea <FiArrowRight aria-hidden="true" /></Link>
            </div>
          ) : (
            filtered.map((project) => <ProjectCard key={project.id} project={project} />)
          )}
        </div>
      </section>

      <section className="catalog-cta">
        <div>
          <p className="section-label">Have an idea?</p>
          <h2>Bring your curiosity. We’ll build from there.</h2>
        </div>
        <Link to="/#join" className="catalog-hero-action">Join the club <FiArrowRight aria-hidden="true" /></Link>
      </section>
    </main>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const cat = catKey(project.category);
  const mediaUrls = parseMediaUrls(project.media_urls);
  const previewImg = mediaUrls.find((u) => isPreviewImage(u)) || PROJECT_FALLBACK_IMG;
  const categoryLabel = project.category || 'Project';

  return (
    <Link
      to={`/project?id=${project.id}`}
      className="project-card project-catalog-card group"
      data-category={cat}
      aria-label={`View details for ${project.name}`}
    >
      <div className="project-card-flip">
        <div className="project-card-face project-card-front">
          <div className="project-catalog-image">
            <img src={previewImg} alt={project.name} loading="lazy" />
            <span>{categoryLabel}</span>
            <div className="catalog-card-reveal" aria-hidden="true">
              <strong>{project.name}</strong>
              <p>{project.description}</p>
              <small>Team lead · {project.team_lead || 'IEC project team'}</small>
              <span>Learn more <FiArrowUpRight aria-hidden="true" /></span>
            </div>
          </div>
          <div className="project-catalog-copy">
            <h3>{project.name}</h3>
            <p>{project.description}</p>
            <div className="project-catalog-footer">
              <span><small>Team lead</small><strong>{project.team_lead || 'IEC project team'}</strong></span>
              <span className="project-card-learn-more">Learn more <FiArrowUpRight aria-hidden="true" /></span>
            </div>
          </div>
        </div>
        <div className="project-card-face project-card-back" aria-hidden="true">
          <p className="section-label">Innovation</p>
          <h3>{project.name}</h3>
          <p>{project.description}</p>
          <span className="project-card-back-cta">Learn more <FiArrowUpRight aria-hidden="true" /></span>
        </div>
      </div>
    </Link>
  );
}
