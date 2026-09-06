// IEC JKUAT — Admin Console JS
// Handles: Members, Events, Projects, Products

// ═══════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════
let allMembers   = [];
let searchQuery  = '';
let filterCollege = '';
let filterYear   = '';
let filterStatus = '';

let pendingDelete = null; // { fn, label }

// Media upload buffers
const mediaBuffers = { event: [], project: [] };

// ═══════════════════════════════════════════════════
// AUTH GATE — nothing loads until an admin session is verified
// (RLS enforces this server-side too; this is the UI layer)
// ═══════════════════════════════════════════════════
let adminUser = null;

async function verifyAdminSession() {
  const sb = initSupabase();
  if (!sb) return false;
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return false;
  // Must exist in the admins table (RLS allows self-check for admins;
  // non-admins get zero rows back, which fails closed here).
  const { data, error } = await sb.from('admins').select('user_id').limit(1);
  if (error || !data || data.length === 0) {
    await sb.auth.signOut();
    return false;
  }
  adminUser = session.user;
  return true;
}

function showAdminApp() {
  document.getElementById('admin-login')?.remove();
  const emailEl = document.getElementById('admin-user-email');
  if (emailEl && adminUser?.email) emailEl.textContent = adminUser.email;
  loadMembers();
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('admin-login-btn');
  const errEl = document.getElementById('admin-login-error');
  errEl.classList.add('hidden');
  btn.disabled = true; btn.textContent = 'Signing in…';
  try {
    const sb = initSupabase();
    if (!sb) throw new Error('Supabase not loaded');
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Invalid email or password.');
    if (!(await verifyAdminSession())) throw new Error('This account is not an admin.');
    showAdminApp();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Sign In';
  }
}

async function handleAdminLogout() {
  try { await initSupabase()?.auth.signOut(); } catch (_) {}
  window.location.reload();
}

// ═══════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  if (await verifyAdminSession()) showAdminApp();
  // else: login overlay stays up; nothing else loads
});

// ═══════════════════════════════════════════════════
// SIDEBAR / TABS
// ═══════════════════════════════════════════════════
function switchTab(tab) {
  // Update sidebar buttons
  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  // Show correct view
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${tab}`).classList.add('active');
  // Update search placeholder
  const search = document.getElementById('global-search');
  search.placeholder = tab === 'members' ? 'Search members…' :
                       tab === 'events'  ? 'Search events…'  :
                       tab === 'projects'? 'Search projects…' :
                       tab === 'messages'? 'Search messages…' :
                       tab === 'payments'? 'Search payments…' : 'Search products…';
  search.value = '';
  searchQuery = '';
  // Load data
  if (tab === 'members')  loadMembers();
  if (tab === 'events')   loadEvents();
  if (tab === 'projects') loadProjects();
  if (tab === 'products') loadProducts();
  if (tab === 'messages') loadMessages();
  if (tab === 'payments') loadPayments();
  closeSidebar();
}

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
}

// ═══════════════════════════════════════════════════
// SEARCH & FILTER
// ═══════════════════════════════════════════════════
function handleSearch(val) {
  searchQuery = val.toLowerCase();
  renderMembers();
}

function applyFilters() {
  filterCollege = document.getElementById('filter-college').value;
  filterYear    = document.getElementById('filter-year').value;
  filterStatus  = document.getElementById('filter-status').value;
  renderMembers();
}

// ═══════════════════════════════════════════════════
// MEMBERS
// ═══════════════════════════════════════════════════
async function loadMembers() {
  try {
    const sb = initSupabase();
    const { data, error } = await sb
      .from('members')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    allMembers = data || [];
    updateStats();
    renderMembers();
  } catch (err) {
    document.getElementById('members-tbody').innerHTML =
      `<tr><td colspan="10" class="text-center py-8 text-red-400 text-sm">Failed to load: ${err.message}</td></tr>`;
  }
}

function updateStats() {
  const now   = new Date();
  const month = now.getMonth();
  const year  = now.getFullYear();
  const active  = allMembers.filter(m => m.membership_status === 'active').length;
  const pending = allMembers.filter(m => m.membership_status !== 'active').length;
  const thisMonth = allMembers.filter(m => {
    const d = new Date(m.created_at);
    return d.getMonth() === month && d.getFullYear() === year;
  }).length;
  document.getElementById('stat-total').textContent   = allMembers.length;
  document.getElementById('stat-active').textContent  = active;
  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('stat-month').textContent   = thisMonth;
}

function renderMembers() {
  let members = allMembers;

  // Search
  if (searchQuery) {
    members = members.filter(m =>
      (m.full_name   || '').toLowerCase().includes(searchQuery) ||
      (m.reg_number  || '').toLowerCase().includes(searchQuery) ||
      (m.email       || '').toLowerCase().includes(searchQuery) ||
      (m.phone       || '').toLowerCase().includes(searchQuery)
    );
  }
  // Filters
  if (filterCollege) members = members.filter(m => (m.college || '').includes(filterCollege));
  if (filterYear)    members = members.filter(m => String(m.year_of_study) === filterYear);
  if (filterStatus)  members = members.filter(m => m.membership_status === filterStatus);

  const tbody = document.getElementById('members-tbody');
  document.getElementById('members-count').textContent =
    `Showing ${members.length} of ${allMembers.length} members`;

  if (members.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-10 text-white/25 text-sm">No members found</td></tr>`;
    return;
  }

  tbody.innerHTML = members.map(m => {
    const isActive = m.membership_status === 'active';
    const date = new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
    return `
      <tr>
        <td class="font-medium">${esc(m.full_name)}</td>
        <td class="font-mono text-xs text-white/60">${esc(m.reg_number)}</td>
        <td>${esc((m.college || '').split('—')[0].trim())}</td>
        <td class="text-white/60">${esc(m.course || '—')}</td>
        <td class="text-center">${m.year_of_study || '—'}</td>
        <td class="text-white/60">${esc(m.phone || '—')}</td>
        <td class="text-white/50 text-xs">${esc(m.email || '—')}</td>
        <td>
          <span class="badge ${isActive ? 'badge-active' : 'badge-registered'}">
            ${isActive ? '✓ Active' : 'Registered'}
          </span>
        </td>
        <td class="text-white/40 text-xs whitespace-nowrap">${date}</td>
        <td>
          <div class="flex gap-1">
            <button class="btn-ghost-sm" onclick="openEditMember('${m.id}')" title="Edit">
              <span class="material-symbols-outlined text-[13px]">edit</span>
            </button>
            ${!isActive ? `<button class="btn-ghost-sm" onclick="activateMember('${m.id}')" title="Mark as active">
              <span class="material-symbols-outlined text-[13px]">verified</span>
            </button>` : ''}
            <button class="btn-danger" onclick="confirmDelete('member', '${m.id}', '${esc(m.full_name)}')" title="Delete">
              <span class="material-symbols-outlined text-[13px]">delete</span>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function openEditMember(id) {
  const m = allMembers.find(x => x.id === id);
  if (!m) return;
  document.getElementById('member-id').value         = m.id || '';
  document.getElementById('member-name').value       = m.full_name || '';
  document.getElementById('member-reg').value        = m.reg_number || '';
  document.getElementById('member-college').value    = m.college || '';
  document.getElementById('member-course').value     = m.course || '';
  document.getElementById('member-year').value       = m.year_of_study || '';
  document.getElementById('member-phone').value      = m.phone || '';
  document.getElementById('member-email').value      = m.email || '';
  document.getElementById('member-status').value     = m.membership_status || 'registered';
  document.getElementById('member-modal').classList.remove('hidden');
}

async function saveMember(e) {
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const sb = initSupabase();
    const id = document.getElementById('member-id').value;
    const payload = {
      full_name:   document.getElementById('member-name').value.trim(),
      reg_number:  document.getElementById('member-reg').value.trim(),
      college:     document.getElementById('member-college').value.trim(),
      course:      document.getElementById('member-course').value.trim(),
      year_of_study: parseInt(document.getElementById('member-year').value) || null,
      phone:       document.getElementById('member-phone').value.trim(),
      email:       document.getElementById('member-email').value.trim(),
      membership_status: document.getElementById('member-status').value,
    };
    const { error } = await sb.from('members').update(payload).eq('id', id);
    if (error) throw error;
    const m = allMembers.find(x => x.id === id);
    if (m) Object.assign(m, payload);
    updateStats();
    renderMembers();
    showToast('Member updated!', 'success');
    closeModal('member-modal');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="material-symbols-outlined text-[16px]">save</span> Save Changes';
  }
}

async function activateMember(id) {
  try {
    const sb = initSupabase();
    await sb.from('members').update({ membership_status: 'active' }).eq('id', id);
    const m = allMembers.find(x => x.id === id);
    if (m) m.membership_status = 'active';
    updateStats();
    renderMembers();
    showToast('Member activated!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Export CSV ──────────────────────────────────────
function exportCSV() {
  let members = allMembers;
  if (filterCollege) members = members.filter(m => (m.college || '').includes(filterCollege));
  if (filterYear)    members = members.filter(m => String(m.year_of_study) === filterYear);
  if (filterStatus)  members = members.filter(m => m.membership_status === filterStatus);
  if (searchQuery)   members = members.filter(m =>
    (m.full_name || '').toLowerCase().includes(searchQuery) ||
    (m.reg_number || '').toLowerCase().includes(searchQuery)
  );

  const headers = ['Full Name','Reg Number','College','Course','Year','Phone','Email','Status','Joined'];
  const rows = members.map(m => [
    m.full_name, m.reg_number, m.college, m.course,
    m.year_of_study, m.phone, m.email, m.membership_status,
    new Date(m.created_at).toLocaleDateString('en-GB')
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${(v||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `iec-members-${new Date().toISOString().split('T')[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════
async function loadEvents() {
  try {
    const sb = initSupabase();
    const { data, error } = await sb.from('events').select('*').order('event_date', { ascending: false });
    if (error) throw error;
    renderEventsTable(data || []);
  } catch (err) {
    document.getElementById('events-tbody').innerHTML =
      `<tr><td colspan="6" class="text-center py-8 text-red-400 text-sm">${err.message}</td></tr>`;
  }
}

function renderEventsTable(events) {
  const tbody = document.getElementById('events-tbody');
  if (!events.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-white/25 text-sm">No events yet. Add your first event.</td></tr>`;
    return;
  }
  tbody.innerHTML = events.map(ev => {
    let mediaCount = 0;
    try { mediaCount = JSON.parse(ev.media_urls || '[]').length; } catch(_) {}
    const d = new Date(ev.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `
      <tr>
        <td class="font-medium">${esc(ev.title)}</td>
        <td class="text-white/60 text-sm whitespace-nowrap">${d}</td>
        <td>${ev.category ? `<span class="badge badge-registered">${esc(ev.category)}</span>` : '—'}</td>
        <td class="text-white/50 text-sm">${esc(ev.location || '—')}</td>
        <td class="text-white/40 text-xs">${mediaCount} file${mediaCount !== 1 ? 's' : ''}</td>
        <td>
          <div class="flex gap-1">
            <button class="btn-ghost-sm" onclick="editEvent('${ev.id}')">
              <span class="material-symbols-outlined text-[13px]">edit</span>
            </button>
            <button class="btn-danger" onclick="confirmDelete('event', '${ev.id}', '${esc(ev.title)}')">
              <span class="material-symbols-outlined text-[13px]">delete</span>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function openEventModal(ev = null) {
  document.getElementById('event-id').value          = ev?.id || '';
  document.getElementById('event-title').value       = ev?.title || '';
  document.getElementById('event-date').value        = ev?.event_date || '';
  document.getElementById('event-category').value   = ev?.category || '';
  document.getElementById('event-location').value   = ev?.location || '';
  document.getElementById('event-description').value = ev?.description || '';
  // Pre-fill existing embeds (comma-separated) so saving never wipes them.
  document.getElementById('event-embed').value       = parseEmbedUrls(ev?.embed_urls).join(', ');
  document.getElementById('event-media-preview').innerHTML = '';
  document.getElementById('event-media-urls').value  = ev?.media_urls || '[]';
  mediaBuffers.event = [];
  // Pre-fill existing media thumbnails
  try {
    const urls = JSON.parse(ev?.media_urls || '[]');
    mediaBuffers.event = [...urls];
    urls.forEach(url => addMediaThumb(url, 'event'));
  } catch(_) {}
  document.getElementById('event-modal-title').textContent = ev ? 'Edit Event' : 'New Event';
  document.getElementById('event-modal').classList.remove('hidden');
}

async function editEvent(id) {
  try {
    const sb = initSupabase();
    const { data } = await sb.from('events').select('*').eq('id', id).single();
    openEventModal(data);
  } catch (err) { showToast(err.message, 'error'); }
}

async function saveEvent(e) {
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const sb = initSupabase();
    const id = document.getElementById('event-id').value;
    const embedUrls = JSON.stringify(
      document.getElementById('event-embed').value.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
    );
    const payload = {
      title:       document.getElementById('event-title').value.trim(),
      event_date:  document.getElementById('event-date').value,
      category:    document.getElementById('event-category').value || null,
      location:    document.getElementById('event-location').value.trim() || null,
      description: document.getElementById('event-description').value.trim() || null,
      media_urls:  document.getElementById('event-media-urls').value,
      embed_urls:  embedUrls,
    };
    if (id) {
      await sb.from('events').update(payload).eq('id', id);
      showToast('Event updated!', 'success');
    } else {
      await sb.from('events').insert([payload]);
      showToast('Event created!', 'success');
    }
    closeModal('event-modal');
    loadEvents();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="material-symbols-outlined text-[16px]">save</span> Save Event';
  }
}

// ═══════════════════════════════════════════════════
// PROJECTS
// ═══════════════════════════════════════════════════
async function loadProjects() {
  try {
    const sb = initSupabase();
    const { data, error } = await sb.from('projects').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    renderProjectsTable(data || []);
  } catch (err) {
    document.getElementById('projects-tbody').innerHTML =
      `<tr><td colspan="7" class="text-center py-8 text-red-400 text-sm">${err.message}</td></tr>`;
  }
}

function renderProjectsTable(projects) {
  const tbody = document.getElementById('projects-tbody');
  if (!projects.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-white/25 text-sm">No projects yet.</td></tr>`;
    return;
  }
  const statusColors = { Ideation: 'badge-registered', Incubating: 'badge-active', 'MVP Live': 'badge-active' };
  tbody.innerHTML = projects.map(p => {
    let mediaCount = 0;
    try { mediaCount = JSON.parse(p.media_urls || '[]').length; } catch(_) {}
    return `
      <tr>
        <td class="font-medium">${esc(p.name)}</td>
        <td class="text-white/60">${esc(p.team_lead)}</td>
        <td class="text-white/50 text-sm">${esc(p.category || '—')}</td>
        <td><span class="badge ${statusColors[p.status] || 'badge-registered'}">${esc(p.status)}</span></td>
        <td>
          <div class="flex items-center gap-2">
            <div class="flex-1 h-1.5 rounded-full" style="background: rgba(255,255,255,0.1); max-width: 80px;">
              <div class="h-full rounded-full bg-iec-blue" style="width: ${p.progress || 0}%"></div>
            </div>
            <span class="text-xs text-white/40">${p.progress || 0}%</span>
          </div>
        </td>
        <td class="text-white/40 text-xs">${mediaCount} file${mediaCount !== 1 ? 's' : ''}</td>
        <td>
          <div class="flex gap-1">
            <button class="btn-ghost-sm" onclick="editProject('${p.id}')">
              <span class="material-symbols-outlined text-[13px]">edit</span>
            </button>
            <button class="btn-danger" onclick="confirmDelete('project', '${p.id}', '${esc(p.name)}')">
              <span class="material-symbols-outlined text-[13px]">delete</span>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function openProjectModal(p = null) {
  document.getElementById('project-id').value          = p?.id || '';
  document.getElementById('project-name').value        = p?.name || '';
  document.getElementById('project-lead').value        = p?.team_lead || '';
  document.getElementById('project-status').value      = p?.status || 'Ideation';
  document.getElementById('project-category').value   = p?.category || '';
  document.getElementById('project-progress').value   = p?.progress || '';
  document.getElementById('project-description').value = p?.description || '';
  // Pre-fill existing embeds (comma-separated) so saving never wipes them.
  document.getElementById('project-embed').value       = parseEmbedUrls(p?.embed_urls).join(', ');
  document.getElementById('project-media-preview').innerHTML = '';
  document.getElementById('project-media-urls').value  = p?.media_urls || '[]';
  mediaBuffers.project = [];
  try {
    const urls = JSON.parse(p?.media_urls || '[]');
    mediaBuffers.project = [...urls];
    urls.forEach(url => addMediaThumb(url, 'project'));
  } catch(_) {}
  document.getElementById('project-modal-title').textContent = p ? 'Edit Project' : 'New Project';
  document.getElementById('project-modal').classList.remove('hidden');
}

async function editProject(id) {
  try {
    const sb = initSupabase();
    const { data } = await sb.from('projects').select('*').eq('id', id).single();
    openProjectModal(data);
  } catch (err) { showToast(err.message, 'error'); }
}

async function saveProject(e) {
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const sb = initSupabase();
    const id = document.getElementById('project-id').value;
    const embedUrl = document.getElementById('project-embed').value.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    const payload = {
      name:        document.getElementById('project-name').value.trim(),
      team_lead:   document.getElementById('project-lead').value.trim(),
      status:      document.getElementById('project-status').value,
      category:    document.getElementById('project-category').value || null,
      progress:    parseInt(document.getElementById('project-progress').value) || 0,
      description: document.getElementById('project-description').value.trim() || null,
      media_urls:  document.getElementById('project-media-urls').value,
      embed_urls:  JSON.stringify(embedUrl),
    };
    if (id) {
      await sb.from('projects').update(payload).eq('id', id);
      showToast('Project updated!', 'success');
    } else {
      await sb.from('projects').insert([payload]);
      showToast('Project created!', 'success');
    }
    closeModal('project-modal');
    loadProjects();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="material-symbols-outlined text-[16px]">save</span> Save Project';
  }
}

// ═══════════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════════
async function loadProducts() {
  try {
    const sb = initSupabase();
    const { data, error } = await sb.from('products').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    renderProductsTable(data || []);
  } catch (err) {
    document.getElementById('products-tbody').innerHTML =
      `<tr><td colspan="7" class="text-center py-8 text-red-400 text-sm">${err.message}</td></tr>`;
  }
}

function renderProductsTable(products) {
  const tbody = document.getElementById('products-tbody');
  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-white/25 text-sm">No products yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = products.map(p => {
    let sizes = [];
    try { sizes = JSON.parse(p.sizes || '[]'); } catch(_) {}
    return `
      <tr>
        <td>
          ${p.image_url
            ? `<img src="${esc(p.image_url)}" class="w-10 h-10 rounded object-cover" alt=""/>`
            : `<div class="w-10 h-10 rounded flex items-center justify-center" style="background:rgba(255,255,255,0.06);">
                <span class="material-symbols-outlined text-white/25 text-[18px]">image</span>
               </div>`}
        </td>
        <td class="font-medium">${esc(p.name)}</td>
        <td class="text-iec-blue font-semibold">KES ${(p.price || 0).toLocaleString()}</td>
        <td class="text-white/50 text-sm">${esc(p.category)}</td>
        <td class="text-white/40 text-xs">${sizes.length ? sizes.join(', ') : '—'}</td>
        <td>${p.is_member_exclusive
            ? '<span class="badge badge-active text-[10px]">Yes</span>'
            : '<span class="text-white/25 text-xs">No</span>'}</td>
        <td>
          <div class="flex gap-1">
            <button class="btn-ghost-sm" onclick="editProduct('${p.id}')">
              <span class="material-symbols-outlined text-[13px]">edit</span>
            </button>
            <button class="btn-danger" onclick="confirmDelete('product', '${p.id}', '${esc(p.name)}')">
              <span class="material-symbols-outlined text-[13px]">delete</span>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function openProductModal(p = null) {
  document.getElementById('product-id').value          = p?.id || '';
  document.getElementById('product-name').value        = p?.name || '';
  document.getElementById('product-price').value       = p?.price || '';
  document.getElementById('product-category').value   = p?.category || 'Apparel';
  document.getElementById('product-description').value = p?.description || '';
  document.getElementById('product-exclusive').checked = p?.is_member_exclusive || false;
  document.getElementById('product-image-url').value  = p?.image_url || '';
  document.getElementById('product-image-preview').innerHTML = '';
  if (p?.image_url) addMediaThumb(p.image_url, 'product-image');
  try {
    const sizes = JSON.parse(p?.sizes || '[]');
    document.getElementById('product-sizes').value = sizes.join(',');
  } catch(_) { document.getElementById('product-sizes').value = ''; }
  document.getElementById('product-modal-title').textContent = p ? 'Edit Product' : 'New Product';
  document.getElementById('product-modal').classList.remove('hidden');
}

async function editProduct(id) {
  try {
    const sb = initSupabase();
    const { data } = await sb.from('products').select('*').eq('id', id).single();
    openProductModal(data);
  } catch (err) { showToast(err.message, 'error'); }
}

async function saveProduct(e) {
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const sb = initSupabase();
    const id = document.getElementById('product-id').value;
    const sizesRaw = document.getElementById('product-sizes').value.trim();
    const sizes = sizesRaw ? JSON.stringify(sizesRaw.split(',').map(s => s.trim()).filter(Boolean)) : '[]';
    const payload = {
      name:               document.getElementById('product-name').value.trim(),
      price:              parseInt(document.getElementById('product-price').value),
      category:           document.getElementById('product-category').value,
      description:        document.getElementById('product-description').value.trim() || null,
      is_member_exclusive: document.getElementById('product-exclusive').checked,
      sizes:              sizes,
      image_url:          document.getElementById('product-image-url').value || null,
    };
    if (id) {
      await sb.from('products').update(payload).eq('id', id);
      showToast('Product updated!', 'success');
    } else {
      await sb.from('products').insert([payload]);
      showToast('Product created!', 'success');
    }
    closeModal('product-modal');
    loadProducts();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="material-symbols-outlined text-[16px]">save</span> Save Product';
  }
}

// ═══════════════════════════════════════════════════
// MEDIA UPLOAD
// ═══════════════════════════════════════════════════
async function handleMediaFiles(e, type) {
  const files = Array.from(e.target.files);
  if (!files.length) return;
  const bucket = type === 'event' ? 'event-media' : 'project-media';

  for (const file of files) {
    const placeholder = addMediaThumb(null, type, true);
    try {
      const url = await uploadMedia(file, bucket, type);
      mediaBuffers[type].push(url);
      document.getElementById(`${type}-media-urls`).value = JSON.stringify(mediaBuffers[type]);
      // Replace spinner with actual thumb
      placeholder.innerHTML = isVideoUrl(url)
        ? `<video src="${url}" class="w-full h-full object-cover"></video>`
        : `<img src="${url}" class="w-full h-full object-cover" alt=""/>`;
      placeholder.querySelector('.remove-btn')?.removeAttribute('style');
    } catch (err) {
      placeholder.remove();
      showToast('Upload failed: ' + err.message, 'error');
    }
  }
  e.target.value = '';
}

async function handleProductImage(e) {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('product-image-preview').innerHTML = '';
  const placeholder = addMediaThumb(null, 'product-image', true);
  try {
    const url = await uploadMedia(file, 'product-images', 'products');
    document.getElementById('product-image-url').value = url;
    placeholder.innerHTML = `<img src="${url}" class="w-full h-full object-cover" alt=""/>`;
  } catch (err) {
    placeholder.remove();
    showToast('Upload failed: ' + err.message, 'error');
  }
  e.target.value = '';
}

function addMediaThumb(url, type, loading = false) {
  const container = type === 'product-image'
    ? document.getElementById('product-image-preview')
    : document.getElementById(`${type}-media-preview`);
  const div = document.createElement('div');
  div.className = 'media-thumb';
  if (loading) {
    div.innerHTML = `<div class="w-full h-full flex items-center justify-center" style="background:rgba(255,255,255,0.05);">
      <span class="material-symbols-outlined animate-spin text-white/30 text-[18px]">sync</span>
    </div>`;
  } else if (url) {
    div.innerHTML = isVideoUrl(url)
      ? `<video src="${url}" class="w-full h-full object-cover"></video>`
      : `<img src="${url}" class="w-full h-full object-cover" alt=""/>`;
    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '✕';
    removeBtn.type = 'button';
    removeBtn.onclick = () => {
      if (type !== 'product-image') {
        mediaBuffers[type] = mediaBuffers[type].filter(u => u !== url);
        document.getElementById(`${type}-media-urls`).value = JSON.stringify(mediaBuffers[type]);
      } else {
        document.getElementById('product-image-url').value = '';
      }
      div.remove();
    };
    div.appendChild(removeBtn);
  }
  container.appendChild(div);
  return div;
}

// ═══════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════
function confirmDelete(type, id, label) {
  document.getElementById('delete-msg').textContent = `Delete "${label}"? This cannot be undone.`;
  document.getElementById('delete-confirm-btn').onclick = async () => {
    try {
      const sb = initSupabase();
      if (type === 'member')  await sb.from('members').delete().eq('id', id);
      if (type === 'event')   await sb.from('events').delete().eq('id', id);
      if (type === 'project') await sb.from('projects').delete().eq('id', id);
      if (type === 'product') await sb.from('products').delete().eq('id', id);
      showToast('Deleted!', 'success');
      closeModal('delete-modal');
      if (type === 'member')  { allMembers = allMembers.filter(m => m.id !== id); updateStats(); renderMembers(); }
      if (type === 'event')   loadEvents();
      if (type === 'project') loadProjects();
      if (type === 'product') loadProducts();
    } catch (err) { showToast(err.message, 'error'); }
  };
  document.getElementById('delete-modal').classList.remove('hidden');
}

// ═══════════════════════════════════════════════════
// MODAL HELPERS
// ═══════════════════════════════════════════════════
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['event-modal','project-modal','product-modal','member-modal','delete-modal'].forEach(closeModal);
  }
});

// ═══════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════
function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function isVideoUrl(url) {
  if (!url) return false;
  return /\.(mp4|webm|mov|avi)$/i.test(url);
}

// ═══════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════
let allPayments = [];

async function loadPayments() {
  const tbody = document.getElementById('payments-tbody');
  try {
    const sb = initSupabase();
    const { data, error } = await sb
      .from('payments')
      .select('*, members(full_name, reg_number)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    allPayments = data || [];
    renderPaymentsTable(allPayments);
  } catch (err) {
    tbody.innerHTML =
      `<tr><td colspan="6" class="text-center py-8 text-red-400 text-sm">Failed to load: ${esc(err.message)}</td></tr>`;
  }
}

function renderPaymentsTable(payments) {
  const tbody = document.getElementById('payments-tbody');

  const completed = payments.filter(p => p.payment_status === 'completed');
  const pending   = payments.filter(p => p.payment_status === 'pending');
  const failed    = payments.filter(p => !['completed', 'pending'].includes(p.payment_status));
  const collected = completed.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  document.getElementById('pay-stat-total').textContent     = `KES ${collected.toLocaleString()}`;
  document.getElementById('pay-stat-completed').textContent = completed.length;
  document.getElementById('pay-stat-pending').textContent   = pending.length;
  document.getElementById('pay-stat-failed').textContent    = failed.length;

  if (!payments.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-white/25 text-sm">No payments yet.</td></tr>`;
    return;
  }

  const statusBadge = (s) => s === 'completed'
    ? '<span class="badge badge-active">Paid</span>'
    : s === 'pending'
      ? '<span class="badge badge-registered">Pending</span>'
      : '<span class="badge" style="background:rgba(239,68,68,0.1);color:#f87171;border:1px solid rgba(239,68,68,0.25);">Failed</span>';

  tbody.innerHTML = payments.map(p => {
    const member = p.members
      ? `${esc(p.members.full_name)} <span class="text-white/25 text-xs">· ${esc(p.members.reg_number || '')}</span>`
      : '<span class="text-white/25 text-xs">—</span>';
    const date = p.created_at
      ? new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
      : '—';
    return `
      <tr>
        <td class="font-medium">${member}</td>
        <td class="text-white/60 text-sm">${esc(p.phone || '—')}</td>
        <td class="text-iec-blue font-semibold whitespace-nowrap">KES ${(Number(p.amount) || 0).toLocaleString()}</td>
        <td>${statusBadge(p.payment_status)}</td>
        <td class="text-white/40 text-xs font-mono truncate" style="max-width:180px;" title="${esc(p.lipana_ref || '')}">${esc(p.lipana_ref || '—')}</td>
        <td class="text-white/40 text-xs whitespace-nowrap">${date}</td>
      </tr>`;
  }).join('');
}

// ═══════════════════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════════════════
let allMessages = [];

async function loadMessages() {
  const list = document.getElementById('messages-list');
  try {
    const data = await getContactMessages();
    allMessages = data || [];
    renderMessages(allMessages);
  } catch (err) {
    list.innerHTML = `<div class="text-center py-10 text-red-400 text-sm">Failed to load messages: ${esc(err.message)}</div>`;
  }
}

function renderMessages(messages) {
  const list = document.getElementById('messages-list');
  const today = new Date().toISOString().split('T')[0];
  const unread = messages.filter(m => !m.is_read);
  const todayCount = messages.filter(m => m.created_at && m.created_at.startsWith(today)).length;

  document.getElementById('msg-stat-total').textContent = messages.length;
  document.getElementById('msg-stat-unread').textContent = unread.length;
  document.getElementById('msg-stat-today').textContent = todayCount;

  if (messages.length === 0) {
    list.innerHTML = `
      <div class="text-center py-16 text-white/25">
        <span class="material-symbols-outlined text-5xl mb-3 block opacity-40">inbox</span>
        <p class="text-sm">No messages yet</p>
      </div>`;
    return;
  }

  list.innerHTML = messages.map(msg => {
    const isUnread = !msg.is_read;
    const date = msg.created_at ? new Date(msg.created_at) : null;
    const timeAgo = date ? getTimeAgo(date) : '';
    const preview = (msg.message || '').substring(0, 120) + (msg.message && msg.message.length > 120 ? '…' : '');

    return `
      <div class="msg-card ${isUnread ? 'unread' : ''}" data-id="${msg.id}">
        <div class="flex items-start justify-between gap-4 mb-2">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style="background: ${isUnread ? 'rgba(0,174,239,0.12)' : 'rgba(255,255,255,0.06)'};">
              <span class="material-symbols-outlined text-[16px]" style="color: ${isUnread ? '#18C8FF' : 'rgba(255,255,255,0.3)'};">person</span>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="msg-from font-semibold text-sm text-white">${esc(msg.name)}</span>
                <span class="text-white/25 text-xs">•</span>
                <span class="text-white/30 text-xs">${esc(msg.email)}</span>
              </div>
              <p class="msg-subject text-sm font-medium mt-0.5" style="color: ${isUnread ? '#fff' : 'rgba(255,255,255,0.6)'};">${esc(msg.subject)}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-white/25 text-xs whitespace-nowrap">${timeAgo}</span>
            <button onclick="event.stopPropagation(); toggleRead('${msg.id}', ${isUnread})" class="p-1.5 rounded hover:bg-white/5 transition-colors" title="${isUnread ? 'Mark as read' : 'Mark as unread'}">
              <span class="material-symbols-outlined text-[16px]" style="color: ${isUnread ? '#18C8FF' : 'rgba(255,255,255,0.3)'};">${isUnread ? 'mark_email_read' : 'mark_email_unread'}</span>
            </button>
            <button onclick="event.stopPropagation(); deleteMessage('${msg.id}')" class="p-1.5 rounded hover:bg-white/5 transition-colors" title="Delete">
              <span class="material-symbols-outlined text-[16px]" style="color: rgba(255,255,255,0.3);">delete</span>
            </button>
          </div>
        </div>
        <p class="msg-preview text-sm leading-relaxed" style="color: rgba(255,255,255,0.4);">${esc(preview)}</p>
      </div>`;
  }).join('');
}

function getTimeAgo(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
}

async function toggleRead(id, isUnread) {
  try {
    if (isUnread) {
      await markMessageRead(id);
    }
    // Update local state
    const msg = allMessages.find(m => m.id === id);
    if (msg) msg.is_read = isUnread ? true : false;
    renderMessages(allMessages);
    showToast(isUnread ? 'Marked as read' : 'Marked as unread', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteMessage(id) {
  if (!confirm('Delete this message?')) return;
  try {
    await deleteContactMessage(id);
    allMessages = allMessages.filter(m => m.id !== id);
    renderMessages(allMessages);
    showToast('Message deleted', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
