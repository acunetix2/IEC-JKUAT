let allProjects = [];
let projectFilter = 'all';

// Shared with project.html — keep the fallback identical so the list
// thumbnail and the detail-page hero always match.
const PROJECT_FALLBACK_IMG = 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&h=600&fit=crop';

// Extension check that tolerates ?query and #hash suffixes (Unsplash /
// Supabase signed URLs). Mirrors isImg() in project.html.
function isPreviewImage(u) {
  if (!u) return false;
  const clean = String(u).split('?')[0].split('#')[0];
  try {
    return isImageUrl(clean);
  } catch(e) {
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(clean);
  }
}

// Load projects from Supabase
async function loadProjects() {
  try {
    const sb = initSupabase();
    if (!sb) {
      document.getElementById('project-loading').innerHTML = '<p>Unable to connect. Check Supabase config.</p>';
      return;
    }
    
    const { data, error } = await sb.from('projects')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    
    allProjects = data || [];
    renderProjects(allProjects);
  } catch (err) {
    console.error('Projects load error:', err);
    document.getElementById('project-loading').innerHTML = '<p class="text-red-500">Failed to load projects: ' + err.message + '</p>';
  }
}

// Render projects into grid
function updateProjectCount(n) {
  const el = document.getElementById('project-count');
  if (el) el.textContent = n;
}

function renderProjects(projects) {
  const grid = document.getElementById('project-grid');
  updateProjectCount((projects || []).length);

  if (!projects || projects.length === 0) {
    grid.innerHTML = `<div class="py-16 text-center" style="color:rgba(255,255,255,0.25);">
      <span class="material-symbols-outlined text-4xl mb-4 block">rocket</span>
      <p class="text-sm mb-4">No projects here yet. Be the first to incubate!</p>
      <a href="index.html#join" class="text-sm text-iec-blue hover:underline">Submit your idea →</a>
    </div>`;
    return;
  }

  grid.innerHTML = projects.map((project, index) => {
    const cat        = (project.category || '').toLowerCase().replace(/[^a-z0-9]+/g,'');
    const imageRight = index % 2 !== 0;

    let mediaUrls = [];
    try {
      if (Array.isArray(project.media_urls)) {
        mediaUrls = project.media_urls;
      } else if (typeof project.media_urls === 'string') {
        mediaUrls = JSON.parse(project.media_urls || '[]');
      }
    } catch(e) { mediaUrls = []; }
    // Same picker as project.html detail page: strip query/hash before
    // extension check so both pages resolve to the identical thumbnail.
    const previewImg = mediaUrls.find(u => isPreviewImage(u)) || PROJECT_FALLBACK_IMG;

    const statusStyle = {
      'Incubating': { color: '#18C8FF', bg: 'rgba(24,200,255,0.12)', border: 'rgba(24,200,255,0.3)', bar: '#18C8FF' },
      'MVP Live':   { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)',  bar: '#22c55e' },
      'Ideation':   { color: '#FBB03B', bg: 'rgba(251,176,59,0.12)', border: 'rgba(251,176,59,0.3)', bar: '#FBB03B' },
    };
    const ss = statusStyle[project.status] || statusStyle['Ideation'];

    const safeName = escapeHtml(project.name);
    const safeDesc = escapeHtml(project.description || '');
    const safeLead = escapeHtml(project.team_lead);
    const categoryLabel = escapeHtml(project.category || 'Project');
    // DOM order is always image → content so mobile stacks uniformly
    // (image first). Alternation on desktop is done with md:order-*.
    const imageHalf = `
      <div class="w-full md:w-1/2 relative ${imageRight ? 'md:order-2' : 'md:order-1'}" style="min-height: 260px;">
        <img class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          src="${previewImg}" alt="${safeName}" loading="lazy"/>
      </div>`;

    const contentHalf = `
      <div class="w-full md:w-1/2 p-5 sm:p-8 md:p-12 flex flex-col justify-center ${imageRight ? 'md:order-1' : 'md:order-2'}" style="background: rgba(255,255,255,0.02);">
        <p class="section-label mb-3">${categoryLabel}</p>
        <h2 class="project-title font-display font-bold mb-3" style="font-size: clamp(1.4rem, 2.5vw, 2rem);">${safeName}</h2>
        <p class="project-desc text-sm leading-relaxed mb-5 max-w-md line-clamp-3 sm:line-clamp-4">${safeDesc}</p>
        <div class="flex items-center gap-3">
          <span class="text-white/30 text-xs uppercase tracking-wider">Team Lead</span>
          <span class="text-white/70 text-sm font-medium">${safeLead}</span>
        </div>
      </div>`;

    return `
      <a href="project.html?id=${project.id}"
        class="project-card group relative overflow-hidden flex flex-col md:flex-row"
        data-category="${cat}"
        aria-label="View details for ${safeName}"
        style="min-height: 320px; display: flex;
               background: rgba(255,255,255,0.03);
               border: 1px solid rgba(255,255,255,0.07);
               border-radius: 8px; text-decoration: none; color: inherit;">
        ${imageHalf + contentHalf}
      </a>`;
  }).join('');
}

function openProjectModal(projectId) {
  window.location.href = 'project.html?id=' + projectId;
}

function closeProjectModal() {}
// Project filter logic
document.querySelectorAll('.filter-btn').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
    });
    button.classList.add('active');
    button.setAttribute('aria-pressed', 'true');
    button.classList.add('scale-95');
    setTimeout(() => button.classList.remove('scale-95'), 100);

    const category = button.dataset.category;
    projectFilter = category;
    if (category === 'all') {
      renderProjects(allProjects);
    } else {
      const filtered = allProjects.filter(p => (p.category || '').toLowerCase().replace(/[^a-z0-9]+/g, '') === category);
      renderProjects(filtered);
    }
  });
});

// Init
document.addEventListener('DOMContentLoaded', () => {
  loadProjects();
});
