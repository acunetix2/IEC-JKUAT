// IEC JKUAT — Project showcase. Ported from showcase.html + showcase.js.
// Fetches projects via getProjects(), renders alternating image/content cards,
// supports category filters, and shows the incubation CTA.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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

type StatusStyle = { color: string; bg: string; border: string; bar: string };
const STATUS_STYLE: Record<string, StatusStyle> = {
  Incubating: { color: '#18C8FF', bg: 'rgba(24,200,255,0.12)', border: 'rgba(24,200,255,0.3)', bar: '#18C8FF' },
  'MVP Live': { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', bar: '#22c55e' },
  Ideation: { color: '#FBB03B', bg: 'rgba(251,176,59,0.12)', border: 'rgba(251,176,59,0.3)', bar: '#FBB03B' },
};

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
    <main style={{ paddingTop: '72px' }}>
      {/* Header + filters */}
      <section className="px-6 md:px-16 max-w-screen-xl mx-auto pt-10 pb-8 md:pt-14 md:pb-10 text-center">
        <p className="section-label mb-4">What We're Building</p>
        <h1
          className="font-display font-extrabold text-white mb-4"
          style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', lineHeight: 1.05, letterSpacing: '-0.03em' }}
        >
          Project Showcase
        </h1>
        <p className="text-white/60 text-base max-w-xl mx-auto leading-relaxed mb-6">
          Student startups, prototypes and ventures built inside IEC JKUAT. Ideas that started in a lecture hall and
          grew beyond it.
        </p>
        <p className="text-white/30 text-xs mb-4">{filtered.length} projects</p>
        <div className="flex flex-wrap justify-center gap-2" id="project-filters" role="group" aria-label="Filter projects by category">
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
      </section>

      {/* Project list */}
      <section className="px-6 md:px-16 max-w-screen-xl mx-auto mb-24">
        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.07)', marginBottom: '2rem' }} />
        <div className="space-y-4">
          {loading ? (
            <div className="py-16 text-center text-white/30">
              <span className="material-symbols-outlined animate-spin inline-block text-3xl mb-3">sync</span>
              <p className="text-sm">Loading projects...</p>
            </div>
          ) : error ? (
            <p className="text-red-500 py-16 text-center">Failed to load projects: {error}</p>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>
              <span className="material-symbols-outlined text-4xl mb-4 block">rocket</span>
              <p className="text-sm mb-4">No projects here yet. Be the first to incubate!</p>
              <Link to="/#join" className="text-sm text-iec-blue hover:underline">
                Submit your idea →
              </Link>
            </div>
          ) : (
            filtered.map((project, index) => <ProjectCard key={project.id} project={project} index={index} />)
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-16 max-w-screen-xl mx-auto mb-20">
        <div
          className="relative overflow-hidden p-6 sm:p-12 md:p-20 text-center"
          style={{ background: 'rgba(0,174,239,0.05)', border: '1px solid rgba(0,174,239,0.12)', borderRadius: '12px' }}
        >
          <div
            className="absolute -top-20 -right-20 w-80 h-80 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(0,174,239,0.08), transparent 70%)', filter: 'blur(40px)' }}
          />
          <div className="relative z-10">
            <p className="section-label mb-5">Incubation</p>
            <h2 className="font-display font-bold text-white mb-6" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 3rem)' }}>
              Have something you're building?
            </h2>
            <p className="text-white/60 text-base max-w-xl mx-auto mb-10 leading-relaxed">
              Whether you have a scribbled idea or a working prototype, IEC gives you the mentorship, resources and
              network to scale it.
            </p>
            <Link to="/#join" className="btn-primary">
              Submit for Incubation <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const cat = catKey(project.category);
  const imageRight = index % 2 !== 0;
  const mediaUrls = parseMediaUrls(project.media_urls);
  const previewImg = mediaUrls.find((u) => isPreviewImage(u)) || PROJECT_FALLBACK_IMG;
  const categoryLabel = project.category || 'Project';
  // STATUS_STYLE is retained for parity with the source; status accents are
  // applied on the detail page.
  void STATUS_STYLE;

  const imageHalf = (
    <div className={`w-full md:w-1/2 relative ${imageRight ? 'md:order-2' : 'md:order-1'}`} style={{ minHeight: '260px' }}>
      <img
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        src={previewImg}
        alt={project.name}
        loading="lazy"
      />
    </div>
  );

  const contentHalf = (
    <div
      className={`w-full md:w-1/2 p-5 sm:p-8 md:p-12 flex flex-col justify-center ${imageRight ? 'md:order-1' : 'md:order-2'}`}
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      <p className="section-label mb-3">{categoryLabel}</p>
      <h2 className="project-title font-display font-bold mb-3" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)' }}>
        {project.name}
      </h2>
      <p className="project-desc text-sm leading-relaxed mb-5 max-w-md line-clamp-3 sm:line-clamp-4">{project.description}</p>
      <div className="flex items-center gap-3">
        <span className="text-white/30 text-xs uppercase tracking-wider">Team Lead</span>
        <span className="text-white/70 text-sm font-medium">{project.team_lead}</span>
      </div>
    </div>
  );

  return (
    <Link
      to={`/project?id=${project.id}`}
      className="project-card group relative overflow-hidden flex flex-col md:flex-row"
      data-category={cat}
      aria-label={`View details for ${project.name}`}
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
