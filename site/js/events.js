let allEvents = [];
let eventFilter = 'all';

// Shared with event.html — keep the fallback identical so the list
// thumbnail and the detail-page hero always match.
const EVENT_FALLBACK_IMG = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop';

// Extension check that tolerates ?query and #hash suffixes (Unsplash /
// Supabase signed URLs). Mirrors isImg() in event.html.
function isPreviewImage(u) {
  if (!u) return false;
  const clean = String(u).split('?')[0].split('#')[0];
  try {
    return isImageUrl(clean);
  } catch(e) {
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(clean);
  }
}

function parseMediaUrls(raw) {
  try {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') return JSON.parse(raw || '[]');
  } catch(e) {}
  return [];
}

function updateEventCount(n) {
  const el = document.getElementById('event-count');
  if (el) el.textContent = n;
}

// Load events from Supabase
async function loadEvents() {
  try {
    const sb = initSupabase();
    if (!sb) {
      document.getElementById('events-loading').innerHTML = '<p>Unable to connect. Check Supabase config.</p>';
      return;
    }
    
    const { data, error } = await sb.from('events')
      .select('*')
      .order('event_date', { ascending: true })
      .limit(100);
    
    if (error) throw error;
    
    allEvents = data || [];
    renderEvents(allEvents);
  } catch (err) {
    console.error('Events load error:', err);
    document.getElementById('events-loading').innerHTML = '<p class="text-red-500">Failed to load events: ' + err.message + '</p>';
  }
}

// Renders events into the grid
function renderEvents(events) {
  const grid = document.getElementById('event-grid');
  updateEventCount((events || []).length);

  if (!events || events.length === 0) {
    grid.innerHTML = `<div class="py-16 text-center" style="color:rgba(255,255,255,0.25);">
      <span class="material-symbols-outlined text-4xl mb-4 block">event_busy</span>
      <p class="text-sm">No events scheduled yet. Check back soon.</p>
    </div>`;
    return;
  }

  grid.innerHTML = events.map((event, index) => {
    const date   = new Date(event.event_date);
    const validDate = !isNaN(date.getTime());
    const day    = validDate ? date.getDate() : '—';
    const month  = validDate ? date.toLocaleString('en', { month: 'short' }).toUpperCase() : '';
    const year   = validDate ? date.getFullYear() : '';
    const isPast = validDate && date < new Date();
    const track  = (event.category || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    const imageRight = index % 2 !== 0;

    const mediaUrls = parseMediaUrls(event.media_urls);
    const previewImg = mediaUrls.find(u => isPreviewImage(u)) || EVENT_FALLBACK_IMG;

    const trackAccent = {
      fintech:    '#18C8FF', agtech: '#22c55e', hackathon: '#18C8FF',
      featured:   '#18C8FF', leadership: '#FBB03B', networking: '#ef4444', workshop: '#22c55e',
    };
    const accentColor = trackAccent[track] || '#18C8FF';
    const safeTitle = escapeHtml(event.title);
    const safeDesc = escapeHtml(event.description || '');
    const safeLocation = escapeHtml(event.location || '');
    const categoryLabel = escapeHtml(event.category || 'Event');

    // DOM order is always image → content so mobile stacks uniformly
    // (image first). Alternation on desktop is done with md:order-*.
    const imageHalf = `
      <div class="w-full md:w-1/2 relative ${imageRight ? 'md:order-2' : 'md:order-1'}" style="min-height: 280px;">
        <img class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          src="${previewImg}" alt="${safeTitle}" loading="lazy" ${isPast ? 'style="filter: grayscale(35%); opacity: 0.8;"' : ''}/>
        <div class="absolute top-3 left-3 md:top-5 md:left-5 flex gap-2">
          <span class="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-white px-2.5 py-1 md:px-3 md:py-1.5"
            style="background: ${accentColor}; color: #000; border-radius: 6px;">${categoryLabel}</span>
          ${isPast
            ? `<span class="text-[10px] md:text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 md:px-3 md:py-1.5"
                 style="color:#ffffff; background: rgba(0,0,0,0.6); backdrop-filter: blur(6px); border-radius: 6px;">Past</span>`
            : `<span class="text-[10px] md:text-[11px] font-bold px-2.5 py-1 md:px-3 md:py-1.5"
                 style="color:#ffffff; background: rgba(0,0,0,0.6); backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px;">
                 ${day} ${month} ${year}
               </span>`}
        </div>
      </div>`;

    const contentHalf = `
      <div class="w-full md:w-1/2 p-5 sm:p-8 md:p-12 flex flex-col justify-center ${imageRight ? 'md:order-1' : 'md:order-2'}" style="background: rgba(255,255,255,0.02);">
        <p class="section-label mb-3 flex items-center gap-2">
          <span class="material-symbols-outlined text-[14px]" style="font-variation-settings:'FILL' 1;">bolt</span>
          ${categoryLabel}
        </p>
        <h2 class="event-title font-display font-bold mb-4" style="font-size: clamp(1.5rem, 3vw, 2.2rem); line-height: 1.1;">${safeTitle}</h2>
        <p class="event-desc text-sm leading-relaxed mb-5 max-w-md line-clamp-3 sm:line-clamp-4">${safeDesc}</p>
        ${event.location ? `<p class="flex items-center gap-1.5 text-white/50 text-xs mb-5"><span class="material-symbols-outlined text-[14px]">location_on</span>${safeLocation}</p>` : ''}
        <div class="flex flex-wrap gap-3 justify-center">
          <span class="btn-primary text-sm py-2.5">
            View Details <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
          </span>
        </div>
      </div>`;

    return `
      <a href="event.html?id=${event.id}"
        class="event-card group relative overflow-hidden flex flex-col md:flex-row"
        data-track="${track}"
        aria-label="View details for ${safeTitle}"
        style="min-height: 320px; display: flex;
               background: rgba(255,255,255,0.03);
               border: 1px solid rgba(255,255,255,0.07);
               border-radius: 8px; text-decoration: none; color: inherit;">
        ${imageHalf + contentHalf}
      </a>`;
  }).join('');
}



// Load community gallery from all event media
function loadCommunityGallery() {
  const gallery = document.getElementById('community-gallery');
  if (!gallery) return;
  const allImages = [];
  allEvents.forEach(event => {
    parseMediaUrls(event.media_urls).filter(u => isPreviewImage(u)).forEach(img => allImages.push(img));
  });

  if (allImages.length === 0) {
    const section = document.getElementById('community-section');
    if (section) section.style.display = 'none';
    return;
  }

  // Take first 8 images
  const displayImages = allImages.slice(0, 8);
  gallery.innerHTML = displayImages.map((img, i) => {
    const offset = i % 2 === 1 ? 'md:mt-12' : '';
    return `<div class="aspect-square overflow-hidden ${i < 2 ? '' : offset}"
      style="border-radius: 12px; border: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.03);">
      <img class="w-full h-full object-cover hover:scale-105 transition-transform duration-500" loading="lazy" src="${img}" alt="Event photo ${i + 1}"/>
    </div>`;
  }).join('');
}

function openEventModal(eventId) {
  window.location.href = 'event.html?id=' + eventId;
}

// Event filter logic
document.querySelectorAll('.filter-btn-events').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn-events').forEach(b => {
      b.classList.remove('active-filter');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active-filter');
    btn.setAttribute('aria-pressed', 'true');
    const track = btn.dataset.track;
    eventFilter = track;
    renderEvents(track === 'all' ? allEvents : allEvents.filter(e => (e.category || '').toLowerCase().replace(/[^a-z0-9]+/g, '') === track));
  });
});

// Init
document.addEventListener('DOMContentLoaded', () => {
  loadEvents().then(() => {
    loadCommunityGallery();
  });
});

