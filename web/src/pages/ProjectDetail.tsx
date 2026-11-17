// IEC JKUAT — Project detail. Ported from project.html.
// Reads ?id, fetches the single project, and renders the hero gallery, videos,
// embeds (via EmbedList), an expandable description, and the info sidebar
// (status pill, team lead, category, progress bar). In the shared SiteLayout.

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PROJECT_FALLBACK_IMG, parseJsonList as parseMedia, isPreviewImage as isImg, isVideoMedia as isVid } from '../lib/media';
import { parseEmbedUrls } from '../lib/embeds';
import EmbedList from '../components/EmbedList';
import type { Project } from '../types/db';

type StatusStyle = { color: string; bg: string; bar: string };
const STATUS_STYLE: Record<string, StatusStyle> = {
  Incubating: { color: '#18C8FF', bg: 'rgba(24,200,255,0.12)', bar: '#18C8FF' },
  'MVP Live': { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', bar: '#22c55e' },
  Ideation: { color: '#FBB03B', bg: 'rgba(251,176,59,0.12)', bar: '#FBB03B' },
};

export default function ProjectDetail() {
  const [params] = useSearchParams();
  const id = params.get('id');
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setError('No project ID provided.');
      setLoading(false);
      return;
    }
    let active = true;
    supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error: err }) => {
        if (!active) return;
        if (err || !data) setError('Project not found');
        else {
          setProject(data as Project);
          document.title = `${(data as Project).name} | IEC JKUAT`;
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
          to="/showcase"
          className="inline-flex items-center gap-1.5 text-sm font-medium hover:opacity-70 transition-opacity"
          style={{ color: 'rgba(255,255,255,0.45)' }}
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> All Projects
        </Link>
      </div>

      <main className="px-6 md:px-16 max-w-screen-xl mx-auto py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <span className="material-symbols-outlined animate-spin mr-3">sync</span> Loading project…
          </div>
        ) : error || !project ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-5xl mb-4 block text-red-400">error</span>
            <p className="text-white/50 text-sm">{error || 'Project not found'}</p>
            <Link to="/showcase" className="inline-block mt-6 text-sm text-iec-blue hover:underline">
              ← Back to Projects
            </Link>
          </div>
        ) : (
          <ProjectBody project={project} />
        )}
      </main>
    </>
  );
}

function ProjectBody({ project }: { project: Project }) {
  const media = useMemo(() => parseMedia(project.media_urls), [project.media_urls]);
  const images = useMemo(() => {
    const imgs = media.filter(isImg);
    return imgs.length ? imgs : [PROJECT_FALLBACK_IMG];
  }, [media]);
  const videos = useMemo(() => media.filter(isVid), [media]);
  const embeds = useMemo(() => parseEmbedUrls(project.embed_urls), [project.embed_urls]);

  const [galIdx, setGalIdx] = useState(0);
  const [descOpen, setDescOpen] = useState(false);
  const longDesc = (project.description || '').length > 400;

  const category = project.category || 'Project';
  const ss = STATUS_STYLE[project.status || ''] || STATUS_STYLE.Ideation;
  const total = images.length;
  const goto = (i: number) => setGalIdx(((i % total) + total) % total);
  const progress = project.progress ?? 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left: main content */}
      <div className="lg:col-span-2">
        <div className="detail-gallery photo-overlay-container relative overflow-hidden rounded-xl mb-8" style={{ height: 'clamp(260px,40vw,480px)', background: '#000' }}>
          {images.map((img, i) => (
            <img
              key={i}
              src={img}
              alt={project.name}
              className={`gallery-img${i === galIdx ? ' is-active' : ''}`}
              style={{ opacity: i === galIdx ? 1 : 0 }}
              loading={i === 0 ? undefined : 'lazy'}
            />
          ))}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top,rgba(7,16,26,0.6) 0%,transparent 50%)', pointerEvents: 'none' }}
          />
          <div className="photo-reveal"><strong>{project.name}</strong><span>{category}</span></div>
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
          {project.name}
        </h1>
        <div className="mb-8">
          <p
            id="proj-desc"
            className={`text-sm leading-relaxed whitespace-pre-line ${longDesc && !descOpen ? 'desc-collapsed' : longDesc ? 'desc-open' : ''}`}
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            {project.description}
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

      {/* Right: info sidebar */}
      <div className="lg:col-span-1">
        <div className="sticky top-24 space-y-4">
          <div className="rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 className="font-display font-bold text-white text-base mb-5">Project Info</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-white/30 uppercase tracking-wider mb-1">Status</p>
                <span className="text-[11px] font-bold px-3 py-1.5 rounded-full" style={{ background: ss.bg, color: ss.color }}>
                  {project.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-white/30 uppercase tracking-wider mb-1">Team Lead</p>
                <p className="text-sm text-white/80 font-medium">{project.team_lead}</p>
              </div>
              {project.category && (
                <div>
                  <p className="text-xs text-white/30 uppercase tracking-wider mb-1">Category</p>
                  <p className="text-sm text-white/70">{category}</p>
                </div>
              )}
              {progress > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full" style={{ width: `${progress}%`, background: ss.bar }} />
                  </div>
                </div>
              )}
            </div>
          </div>
          <Link
            to="/showcase"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold hover:opacity-80 transition-opacity"
            style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)' }}
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back to Projects
          </Link>
        </div>
      </div>
    </div>
  );
}
