// IEC JKUAT - Supabase Configuration
// Shared config and utilities for all pages

const SUPABASE_URL = 'https://utdcvzeteiijxwgmzwcs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0ZGN2emV0ZWlpanh3Z216d2NzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0Mjg5NzAsImV4cCI6MjEwNDAwNDk3MH0.Ob-R78VBHZ_vHzTU7iwlgyxH07gufwQnY6jsIkZ66oY';

// Initialize Supabase client (loaded from CDN in HTML)
let supabaseClient = null;

function initSupabase() {
  if (typeof supabase !== 'undefined' && !supabaseClient) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

// ===== HTML Escaping (XSS defense) =====
// Use for EVERY database value interpolated into innerHTML on public pages.
// (embeds.js defines an identical fallback; this assignment wins or loses
// harmlessly since both implementations are the same.)
window.escapeHtml = window.escapeHtml || function (str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

// ===== Form Utilities =====

// Submit member registration to Supabase.
// NOTE: no `.select()` after insert — anon has INSERT but not SELECT on
// members (PII). The new row's id is fetched via the non-PII lookup RPC.
async function submitMemberRegistration(formData) {
  const sb = initSupabase();
  if (!sb) throw new Error('Supabase not loaded');

  const { error } = await sb.from('members').insert([
    {
      full_name: formData.fullName,
      reg_number: formData.regNumber,
      college: formData.college,
      course: formData.course,
      year_of_study: parseInt(formData.yearOfStudy),
      phone: formData.phone,
      email: formData.email,
      membership_status: 'registered'
    }
  ]);

  if (error) {
    if (error.code === '23505') throw new Error('This registration number is already registered. Continue to Activation instead.');
    throw error;
  }

  const found = await lookupMemberByReg(formData.regNumber);
  if (!found) throw new Error('Registered, but we could not load your record. Use Find on the Activation step.');
  return [found];
}

// Non-PII member lookup for public flows (registration return + pay-step
// Find). Returns { id, full_name, reg_number, membership_status } or null.
async function lookupMemberByReg(regNumber) {
  const sb = initSupabase();
  if (!sb) throw new Error('Supabase not loaded');
  const { data, error } = await sb.rpc('find_member_lookup', { p_reg: regNumber });
  if (error) throw error;
  return (data && data[0]) || null;
}

// Submit newsletter signup
async function submitNewsletter(email) {
  const sb = initSupabase();
  if (!sb) throw new Error('Supabase not loaded');
  
  const { data, error } = await sb.from('newsletter').insert([
    { email: email }
  ]).select();
  
  if (error) throw error;
  return data;
}

// Initiate M-Pesa payment via lipana.dev Edge Function
async function initiatePayment(phone, amount, memberId) {
  const sb = initSupabase();
  if (!sb) throw new Error('Supabase not loaded');
  
  const { data, error } = await sb.functions.invoke('stk-push', {
    body: { 
      phone: phone.startsWith('0') ? '+254' + phone.slice(1) : phone,
      amount: amount,
      member_id: memberId
    }
  });
  
  if (error) throw error;
  return data;
}

// ===== Admin CRUD Operations =====

// Fetch all members
// Strip PostgREST filter-DSL metacharacters so search terms can't alter
// query structure (commas split OR-clauses; % _ are LIKE wildcards).
function sanitizeSearchTerm(term) {
  return String(term || '').replace(/[%_,()\\]/g, '').slice(0, 80);
}

async function getMembers(search = '') {
  const sb = initSupabase();
  let query = sb.from('members').select('*').order('created_at', { ascending: false });
  search = sanitizeSearchTerm(search);
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,reg_number.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }
  const { data, error } = await query.limit(100);
  if (error) throw error;
  return data;
}

// Delete a member
async function deleteMember(id) {
  const sb = initSupabase();
  const { error } = await sb.from('members').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// Fetch all projects
async function getProjects(search = '') {
  const sb = initSupabase();
  let query = sb.from('projects').select('*').order('created_at', { ascending: false });
  search = sanitizeSearchTerm(search);
  if (search) {
    query = query.or(`name.ilike.%${search}%,team_lead.ilike.%${search}%`);
  }
  const { data, error } = await query.limit(100);
  if (error) throw error;
  return data;
}

// Add a project
async function addProject(project) {
  const sb = initSupabase();
  const { data, error } = await sb.from('projects').insert([project]).select();
  if (error) throw error;
  return data;
}

// Update a project
async function updateProject(id, updates) {
  const sb = initSupabase();
  const { data, error } = await sb.from('projects').update(updates).eq('id', id).select();
  if (error) throw error;
  return data;
}

// Delete a project
async function deleteProject(id) {
  const sb = initSupabase();
  const { error } = await sb.from('projects').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// Fetch all events
async function getEvents(search = '') {
  const sb = initSupabase();
  let query = sb.from('events').select('*').order('event_date', { ascending: true });
  search = sanitizeSearchTerm(search);
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }
  const { data, error } = await query.limit(100);
  if (error) throw error;
  return data;
}

// Add an event
async function addEvent(event) {
  const sb = initSupabase();
  const { data, error } = await sb.from('events').insert([event]).select();
  if (error) throw error;
  return data;
}

// Delete an event
async function deleteEvent(id) {
  const sb = initSupabase();
  const { error } = await sb.from('events').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ===== Product CRUD =====

async function getProducts() {
  const sb = initSupabase();
  const { data, error } = await sb.from('products').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function addProduct(product) {
  const sb = initSupabase();
  const { data, error } = await sb.from('products').insert([product]).select();
  if (error) throw error;
  return data;
}

async function updateProduct(id, updates) {
  const sb = initSupabase();
  const { data, error } = await sb.from('products').update(updates).eq('id', id).select();
  if (error) throw error;
  return data;
}

async function deleteProduct(id) {
  const sb = initSupabase();
  const { error } = await sb.from('products').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// NOTE: Blog CRUD and event-comment helpers were removed — no UI calls
// them (comments UI was deleted; there is no blog UI). If those features
// return, re-add them alongside their UI and RLS policies.

// ===== Contact Messages =====

async function getContactMessages() {
  const sb = initSupabase();
  const { data, error } = await sb.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) throw error;
  return data;
}

async function markMessageRead(id) {
  const sb = initSupabase();
  const { error } = await sb.from('contact_messages').update({ is_read: true }).eq('id', id);
  if (error) throw error;
  return true;
}

async function deleteContactMessage(id) {
  const sb = initSupabase();
  const { error } = await sb.from('contact_messages').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// NOTE: getMemberGrowth/getRecentActivity were removed — no UI calls them
// (and getRecentActivity sorted on a rawTime field it never set).

function formatTimeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

// ===== Theme System =====
// Dark is the default. Adding class 'light' to <html> enables light mode.
// Preference is stored in localStorage under 'iec-theme'.

function initTheme() {
  const stored = localStorage.getItem('iec-theme');
  // Default: dark. Only switch to light if explicitly stored or OS prefers light AND no stored preference.
  const preferLight = stored === 'light' ||
    (!stored && !window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('light', preferLight);
  document.documentElement.classList.toggle('dark', !preferLight);
  updateThemeButton();
}

function toggleDarkMode() {
  const isLight = document.documentElement.classList.contains('light');
  document.documentElement.classList.toggle('light', !isLight);
  document.documentElement.classList.toggle('dark', isLight);
  localStorage.setItem('iec-theme', isLight ? 'dark' : 'light');
  updateThemeButton();
}

function updateThemeButton() {
  const isLight = document.documentElement.classList.contains('light');
  document.querySelectorAll('[data-theme-icon-dark]').forEach(el => {
    el.style.display = isLight ? 'inline-block' : 'none';
  });
  document.querySelectorAll('[data-theme-icon-light]').forEach(el => {
    el.style.display = isLight ? 'none' : 'inline-block';
  });
}

// ===== Light Mode CSS Injection =====
// Dark is the default. The .light class on <html> applies a properly
// designed light palette with real contrast and visual hierarchy.
//
// Color system for light mode:
//   Page bg:       #eef0f4  (cool blue-grey, not pure white — avoids blinding)
//   Card bg:       #ffffff  (white cards lift off the bg — clear hierarchy)
//   Card border:   rgba(0,0,0,0.10)
//   Elevated bg:   #f6f8fb  (mid-surface for sections)
//   Text primary:  #0d0f12  (near-black, strong)
//   Text secondary:#374151  (dark grey, readable)
//   Text muted:    #6b7280  (grey for labels, timestamps)
//   Text faint:    #9ca3af  (only for truly decorative text)
//   Blue accent:   #0aaad4  (slightly deeper blue for light bg contrast)
//   Gold accent:   #d4890a  (deeper gold for light bg)

function injectDarkModeStyles() {
  // Inject into body AFTER DOMContentLoaded so it beats Tailwind CDN styles
  function doInject() {
    if (document.getElementById('iec-theme-styles')) return;
    const style = document.createElement('style');
    style.id = 'iec-theme-styles';
    style.textContent = `

    /* ─── DARK MODE BASE (always on, no class needed) ────────────────
       Replaces the flat #0a0a0a with a rich dark blue-black that has
       ambient depth, matching the hero's feel throughout the entire page.
    ──────────────────────────────────────────────────────────────── */
    html:not(.light) body {
      background-color: #07101a !important;
      background-image:
        radial-gradient(ellipse 120% 60% at 80% 0%, rgba(0,36,61,0.55), transparent),
        radial-gradient(ellipse 80% 50% at 10% 100%, rgba(0,20,40,0.6), transparent) !important;
      background-attachment: fixed !important;
    }
    html:not(.light) footer {
      background: #050d14 !important;
    }

    /* ── Mobile menu (dark defaults; self-styled, no theme tokens) ── */
    #mobile-menu { background: #0d1b2a; }
    #mobile-menu .menu-head { border-bottom: 1px solid rgba(255,255,255,0.08); }
    #mobile-menu .menu-brand { color: #ffffff; font-size: 17px; }
    #mobile-menu .menu-brand span { color: #18C8FF; }
    #mobile-menu .menu-close { color: rgba(255,255,255,0.55); border-radius: 8px; }
    #mobile-menu .menu-close:hover { color: #18C8FF; }
    #mobile-menu nav a {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px; border-radius: 12px;
      color: #f0f0f0; font-size: 15px; font-weight: 500;
    }
    #mobile-menu nav a:hover { background: rgba(255,255,255,0.06); }
    #mobile-menu nav a .material-symbols-outlined { color: #18C8FF; font-size: 20px; }
    #mobile-menu .menu-foot { border-top: 1px solid rgba(255,255,255,0.08); }
    #mobile-menu .menu-join {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      width: 100%; padding: 12px; border-radius: 12px;
      background: #18C8FF; color: #000; font-weight: 700; font-size: 14px;
    }

    /* ── Page base ──────────────────────────────────────────── */
    html.light body {
      background: #eef0f4 !important;
      color: #0d0f12 !important;
    }

    /* ── Nav ────────────────────────────────────────────────── */
    html.light #nav,
    html.light #nav.scrolled {
      background: rgba(238,240,244,0.95) !important;
      border-bottom: 1px solid rgba(0,0,0,0.10) !important;
      backdrop-filter: blur(20px);
    }
    html.light #nav a,
    html.light #nav button { color: #0d0f12 !important; }
    html.light #nav .text-iec-blue,
    html.light #nav a.text-iec-blue { color: #0aaad4 !important; }
    html.light #nav .text-white\\/60,
    html.light #nav a.text-white\\/60 { color: #374151 !important; }
    html.light #nav .text-white\\/50,
    html.light #nav a.text-white\\/50 { color: #6b7280 !important; }
    html.light #nav .btn-primary { background: #0aaad4 !important; color: #fff !important; }

    /* ── Typography — all white/opacity text → real colours ── */
    html.light h1, html.light h2, html.light h3,
    html.light h4, html.light h5, html.light h6 { color: #0d0f12 !important; }

    html.light .text-white         { color: #0d0f12 !important; }
    html.light .text-white\\/80    { color: #1f2937 !important; }
    html.light .text-white\\/75    { color: #1f2937 !important; }
    html.light .text-white\\/70    { color: #374151 !important; }
    html.light .text-white\\/60    { color: #374151 !important; }
    html.light .text-white\\/55    { color: #4b5563 !important; }
    html.light .text-white\\/45    { color: #6b7280 !important; }
    html.light .text-white\\/40    { color: #6b7280 !important; }
    html.light .text-white\\/35    { color: #9ca3af !important; }
    html.light .text-white\\/30    { color: #9ca3af !important; }
    html.light .text-white\\/25    { color: #d1d5db !important; }
    html.light .text-white\\/20    { color: #d1d5db !important; }
    html.light .text-white\\/15    { color: #e5e7eb !important; }
    html.light .text-white\\/10    { color: #f3f4f6 !important; }

    /* Accent colours — slightly deepen for light bg */
    html.light .text-iec-blue,
    html.light .text-tech-blue     { color: #0aaad4 !important; }
    html.light .text-iec-gold,
    html.light .text-jkuat-gold    { color: #d4890a !important; }

    /* ── Section label ──────────────────────────────────────── */
    html.light .section-label      { color: #0aaad4 !important; }

    /* ── Cards ──────────────────────────────────────────────── */
    /* Base card → white, clearly separated from page bg */
    html.light .glass-card,
    html.light .info-card,
    html.light .bento-card,
    html.light .event-card,
    html.light .cart-modal-bg {
      background: #ffffff !important;
      border-color: rgba(0,0,0,0.10) !important;
      color: #0d0f12 !important;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06) !important;
    }
    html.light .bento-card:hover,
    html.light .event-card:hover {
      border-color: rgba(0,153,214,0.35) !important;
      background: #fff !important;
      box-shadow: 0 4px 16px rgba(0,153,214,0.10) !important;
    }

    /* Inline rgba cards (stat boxes, glassmorphism elements) */
    html.light [style*="background: rgba(255,255,255,0.03)"],
    html.light [style*="background: rgba(255,255,255,0.02)"],
    html.light [style*="background: rgba(255,255,255,0.04)"],
    html.light [style*="background: rgba(255,255,255,0.05)"],
    html.light [style*="background: rgba(255,255,255,0.06)"] {
      background: #ffffff !important;
      border-color: rgba(0,0,0,0.09) !important;
    }

    /* Section-level tinted bg */
    html.light [style*="background: rgba(255,255,255,0.015)"] {
      background: #f6f8fb !important;
    }

    /* ── Borders ─────────────────────────────────────────────── */
    html.light [style*="border: 1px solid rgba(255,255,255,0.06)"],
    html.light [style*="border: 1px solid rgba(255,255,255,0.07)"],
    html.light [style*="border: 1px solid rgba(255,255,255,0.08)"],
    html.light [style*="border: 1px solid rgba(255,255,255,0.1)"],
    html.light [style*="border: 1px solid rgba(255,255,255,0.12)"],
    html.light [style*="border: 1px solid rgba(255,255,255,0.15)"],
    html.light [style*="border: 1px solid rgba(255,255,255,0.2)"] {
      border-color: rgba(0,0,0,0.10) !important;
    }
    html.light .border-white\\/6  { border-color: rgba(0,0,0,0.07) !important; }
    html.light .border-white\\/8  { border-color: rgba(0,0,0,0.10) !important; }
    html.light .border-white\\/15 { border-color: rgba(0,0,0,0.12) !important; }
    html.light .rule              { border-color: rgba(0,0,0,0.08) !important; }

    /* ── Stat / accent inline cards ─────────────────────────── */
    html.light [style*="background: rgba(0,174,239,0.08)"],
    html.light [style*="background: rgba(0,174,239,0.12)"] {
      background: rgba(0,153,214,0.08) !important;
    }
    html.light [style*="border: 1px solid rgba(0,174,239,0.2)"],
    html.light [style*="border: 1px solid rgba(0,174,239,0.3)"] {
      border-color: rgba(0,153,214,0.25) !important;
    }
    html.light [style*="background: rgba(251,176,59,0.08)"] {
      background: rgba(212,137,10,0.09) !important;
    }
    html.light [style*="border: 1px solid rgba(251,176,59,0.2)"] {
      border-color: rgba(212,137,10,0.25) !important;
    }
    html.light [style*="background: rgba(255,255,255,0.04)"],
    html.light [style*="background: rgba(255,255,255,0.1)"],
    html.light [style*="background: rgba(255,255,255,0.15)"] {
      background: rgba(0,0,0,0.05) !important;
    }

    /* ── Form inputs ─────────────────────────────────────────── */
    html.light .dark-input,
    html.light .iec-input,
    html.light .comment-input {
      background: #f6f8fb !important;
      border-color: rgba(0,0,0,0.15) !important;
      color: #0d0f12 !important;
    }
    html.light .dark-input::placeholder,
    html.light .iec-input::placeholder,
    html.light .comment-input::placeholder { color: #9ca3af !important; }
    html.light .dark-input:focus,
    html.light .iec-input:focus,
    html.light .comment-input:focus { border-color: #0aaad4 !important; background: #fff !important; }

    /* ── Buttons ─────────────────────────────────────────────── */
    html.light .btn-primary { background: #0aaad4 !important; color: #fff !important; }
    html.light .btn-primary:hover { box-shadow: 0 0 24px rgba(0,153,214,0.35) !important; }
    html.light .btn-ghost {
      color: #374151 !important;
      border-color: rgba(0,0,0,0.18) !important;
    }
    html.light .btn-ghost:hover { background: rgba(0,0,0,0.05) !important; color: #0d0f12 !important; }

    /* ── Pills / tags ───────────────────────────────────────── */
    html.light .pill {
      border-color: rgba(0,0,0,0.14) !important;
      color: #4b5563 !important;
      background: #fff !important;
    }
    html.light .pill-blue {
      background: rgba(0,153,214,0.09) !important;
      border-color: rgba(0,153,214,0.28) !important;
      color: #0aaad4 !important;
    }
    html.light .discipline-tag {
      border-color: rgba(255,255,255,0.3) !important;
      color: rgba(255,255,255,0.95) !important;
      background: rgba(0,0,0,0.55) !important;
    }
    html.light .discipline-tag:hover {
      background: rgba(0,153,214,0.35) !important;
      border-color: #18C8FF !important;
      color: #fff !important;
    }

    /* ── Filter buttons ─────────────────────────────────────── */
    html.light .filter-btn,
    html.light .filter-btn-events {
      border-color: rgba(0,0,0,0.15) !important;
      color: #4b5563 !important;
      background: #fff !important;
    }
    html.light .filter-btn:hover,
    html.light .filter-btn-events:hover {
      background: rgba(0,153,214,0.07) !important;
      border-color: rgba(0,153,214,0.3) !important;
      color: #0aaad4 !important;
    }
    html.light .filter-btn.active {
      background: #0aaad4 !important;
      border-color: #0aaad4 !important;
      color: #fff !important;
    }
    html.light .filter-btn-events.active-filter {
      background: rgba(0,153,214,0.1) !important;
      border-color: rgba(0,153,214,0.4) !important;
      color: #0aaad4 !important;
    }

    /* ── Social buttons ─────────────────────────────────────── */
    html.light .social-btn,
    html.light .social-icon {
      background: #fff !important;
      border-color: rgba(0,0,0,0.12) !important;
      color: #6b7280 !important;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    html.light .social-btn:hover,
    html.light .social-icon:hover {
      background: rgba(0,153,214,0.07) !important;
      border-color: rgba(0,153,214,0.3) !important;
      color: #0aaad4 !important;
    }

    /* ── Hero ───────────────────────────────────────────────── */
    /* Hero is identical in both themes: same backdrop, full canvas */
    html.light #hero-canvas { opacity: 1 !important; }
    html.light section:has(#hero-canvas) {
      background: radial-gradient(ellipse 110% 90% at 70% 40%, rgba(0,46,80,0.7), transparent), #07101a !important;
    }
    /* Hero text stays white on the dark hero bg — override the body text flip */
    html.light section:has(#hero-canvas) .text-white,
    html.light section:has(#hero-canvas) h1,
    html.light section:has(#hero-canvas) p { color: #fff !important; }
    html.light section:has(#hero-canvas) .text-white\\/55,
    html.light section:has(#hero-canvas) .text-white\\/45 { color: rgba(255,255,255,0.65) !important; }

    /* ── "What we do" cards ──────────────────────────────────── */
    html.light .do-card {
      background: #ffffff !important;
      border-top-color: rgba(0,0,0,0.08) !important;
    }
    html.light .do-card .do-number { color: rgba(0,0,0,0.11) !important; }
    html.light .do-card:hover::before {
      background: linear-gradient(135deg, rgba(0,153,214,0.05), transparent) !important;
    }
    /* When photo shows on hover, force all text white so it's readable over the dark image */
    html.light .do-card:hover,
    html.light .do-card:hover *,
    html.light .do-card:hover h3,
    html.light .do-card:hover p,
    html.light .do-card:hover span:not(.do-number) {
      color: #ffffff !important;
    }
    html.light .do-card:hover .do-number { color: rgba(255,255,255,0.12) !important; }

    /* ── Journey ─────────────────────────────────────────────── */
    html.light .journey-step { border-left-color: rgba(0,0,0,0.10) !important; }
    html.light .journey-step.journey-active { border-left-color: rgba(0,153,214,0.5) !important; }

    /* ── Step tabs (join form) ───────────────────────────────── */
    html.light .step-tab {
      color: #9ca3af !important;
      border-color: rgba(0,0,0,0.08) !important;
    }
    html.light .step-tab.active { color: #0aaad4 !important; border-color: #0aaad4 !important; }

    /* ── Join section bg ─────────────────────────────────────── */
    html.light .join-bg {
      background: linear-gradient(to top, rgba(0,153,214,0.06), transparent), #eef0f4 !important;
    }
    /* Join form card */
    html.light .join-bg [style*="background: rgba(255,255,255,0.03)"],
    html.light .join-bg [style*="background: rgba(255,255,255,0.04)"] {
      background: #fff !important;
      border-color: rgba(0,0,0,0.1) !important;
    }

    /* ── Sections with dark accent bg (keep dark, adjust text) ─ */
    /* Stats band / navy sections stay dark — they need to contrast */
    html.light .stat-band { background: #0f3460 !important; }
    html.light [style*="background: #00243d"] { background: #0d2e50 !important; }

    /* Dark blue sections — text stays white, leave as is */

    /* ── CTA sections ────────────────────────────────────────── */
    html.light [style*="background: rgba(0,174,239,0.05)"],
    html.light [style*="background: rgba(0,174,239,0.04)"] {
      background: rgba(0,153,214,0.06) !important;
    }
    html.light [style*="border: 1px solid rgba(0,174,239,0.12)"] {
      border-color: rgba(0,153,214,0.18) !important;
    }

    /* ── Marquee ─────────────────────────────────────────────── */
    html.light .marquee-photo { filter: saturate(1.0) brightness(1.0) !important; }
    html.light .marquee-photo:hover { filter: saturate(1.1) brightness(1.05) !important; }

    /* ── "Who can join" section — keep identical to dark mode ──
       This section always sits over a dark photo, so heading, tags,
       quote and label must stay white regardless of theme.         */
    html.light section:has(.discipline-tag) {
      /* Restore photo to the same brightness as dark mode */
    }
    html.light section:has(.discipline-tag) > .absolute img {
      filter: saturate(0.9) brightness(0.65) !important;
    }
    html.light section:has(.discipline-tag) .section-label { color: #18C8FF !important; }
    html.light section:has(.discipline-tag) h2,
    html.light section:has(.discipline-tag) .text-white { color: #ffffff !important; }
    html.light section:has(.discipline-tag) .text-white\\/70,
    html.light section:has(.discipline-tag) .text-white\\/65 { color: rgba(255,255,255,0.75) !important; }
    html.light section:has(.discipline-tag) p { color: rgba(255,255,255,0.7) !important; }
    html.light section:has(.discipline-tag) .border-iec-blue { border-color: #18C8FF !important; }

    /* ── Footer ─────────────────────────────────────────────── */
    html.light footer {
      background: #e4e7ec !important;
    }
    /* Blanket — make everything in the footer near-black */
    html.light footer * { color: #111318 !important; }
    /* Exceptions */
    html.light footer .text-iec-blue,
    html.light footer a[href*="index.html"] span.text-iec-blue { color: #0aaad4 !important; }
    html.light footer a:hover { color: #0aaad4 !important; }
    html.light footer .border-white\\/6 { border-color: rgba(0,0,0,0.12) !important; }
    html.light footer .btn-primary { background: #0aaad4 !important; color: #fff !important; }
    html.light footer .btn-primary * { color: #fff !important; }

    /* ── Mobile menu ─────────────────────────────────────────── */
    html.light #mobile-menu { background: #ffffff !important; }
    html.light #mobile-menu .menu-brand { color: #0d0f12 !important; }
    html.light #mobile-menu .menu-brand span { color: #0aaad4 !important; }
    html.light #mobile-menu .menu-close { color: #6b7280 !important; }
    html.light #mobile-menu .menu-head { border-color: rgba(0,0,0,0.08) !important; }
    html.light #mobile-menu .menu-foot { border-color: rgba(0,0,0,0.08) !important; }
    html.light #mobile-menu nav a { color: #1f2937 !important; }
    html.light #mobile-menu nav a:hover { background: rgba(0,153,214,0.06) !important; }
    html.light #mobile-menu nav a .material-symbols-outlined { color: #0077a8 !important; }
    html.light #mobile-menu .menu-join { background: #0077a8 !important; color: #ffffff !important; }
    html.light #admin-sidebar-overlay { background: rgba(0,0,0,0.3) !important; }

    /* ── Modals ─────────────────────────────────────────────── */
    html.light .modal-overlay { background: rgba(0,0,0,0.4) !important; }
    html.light [style*="background:#111"],
    html.light [style*="background: #111"] { background: #ffffff !important; }
    html.light .cart-modal-bg { background: #ffffff !important; }

    /* ── "What is IEC" collage ───────────────────────────────── */
    html.light .absolute.inset-0 > img { /* Lighten dark overlay on collage */ }

    /* ── Scroll indicator ───────────────────────────────────── */
    html.light .w-px.h-8.bg-white\\/30 { background: rgba(0,0,0,0.25) !important; }

    /* ── FOOTER NUCLEAR OVERRIDE ──────────────────────────────
       All footer text must be black in light mode.
       Using maximum specificity to beat Tailwind opacity utilities.
    ──────────────────────────────────────────────────────────── */
    html.light footer,
    html.light footer div,
    html.light footer p,
    html.light footer span,
    html.light footer a,
    html.light footer li,
    html.light footer h1,
    html.light footer h2,
    html.light footer h3,
    html.light footer h4,
    html.light footer ul {
      color: #0d0f12 !important;
    }
    html.light footer a:hover { color: #0aaad4 !important; }
    html.light footer span.text-iec-blue { color: #0aaad4 !important; }
  `;
    (document.body || document.head).appendChild(style);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', doInject);
  } else {
    doInject();
  }
}

// Auto-init theme on every page load
initTheme();
injectDarkModeStyles();

// ===== Toast Notification =====

function showToast(message, type = 'success') {
  const colors = {
    success: 'bg-jkuat-green text-white',
    error: 'bg-red-500 text-white',
    info: 'bg-tech-blue text-white'
  };
  const icons = {
    success: 'check_circle',
    error: 'error',
    info: 'info'
  };
  
  // Remove existing toast
  const existing = document.getElementById('iec-toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.id = 'iec-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.className = `fixed bottom-8 right-8 z-[100] ${colors[type] || colors.success} rounded-xl px-6 py-4 shadow-2xl flex items-center gap-3 font-body-md text-body-md transition-all duration-300 translate-y-0 opacity-100`;
  // Message uses textContent (never innerHTML): error strings can echo
  // user input and must not become executable markup.
  const icon = document.createElement('span');
  icon.className = 'material-symbols-outlined';
  icon.textContent = icons[type] || icons.success;
  const label = document.createElement('span');
  label.textContent = message;
  toast.append(icon, label);
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.transform = 'translateY(20px)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== Navigation & UI Utilities =====

// Toggle mobile menu
function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  const overlay = document.getElementById('mobile-overlay');
  const body = document.body;
  
  if (menu.classList.contains('translate-x-full')) {
    menu.classList.remove('translate-x-full');
    overlay.classList.remove('hidden');
    body.style.overflow = 'hidden';
  } else {
    menu.classList.add('translate-x-full');
    overlay.classList.add('hidden');
    body.style.overflow = '';
  }
}

// Close mobile menu
function closeMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  const overlay = document.getElementById('mobile-overlay');
  if (menu) menu.classList.add('translate-x-full');
  if (overlay) overlay.classList.add('hidden');
  document.body.style.overflow = '';
}

// Load Supabase SDK
function loadSupabaseSDK() {
  return new Promise((resolve, reject) => {
    if (typeof supabase !== 'undefined') {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@supabase/supabase-js@2';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Mobile menu HTML
// NOTE: deliberately styled via #mobile-menu CSS below — NOT via per-page
// Tailwind theme tokens (text-on-surface etc.), which most pages don't
// define and therefore render unpredictably per page/theme.
const MOBILE_MENU_HTML = `
<div id="mobile-overlay" class="fixed inset-0 bg-black/40 z-40 hidden md:hidden" onclick="closeMobileMenu()"></div>
<div id="mobile-menu" class="fixed top-0 right-0 h-full w-72 z-50 shadow-2xl translate-x-full transition-transform duration-300 ease-in-out md:hidden flex flex-col">
  <div class="menu-head flex justify-between items-center p-6">
    <span class="font-display font-bold menu-brand">IEC <span>JKUAT</span></span>
    <button onclick="closeMobileMenu()" class="menu-close p-2" aria-label="Close menu">
      <span class="material-symbols-outlined">close</span>
    </button>
  </div>
  <nav class="p-6 flex flex-col gap-1 flex-1 overflow-y-auto">
    <a href="index.html" onclick="closeMobileMenu()">
      <span class="material-symbols-outlined">home</span>
      Home
    </a>
    <a href="events.html" onclick="closeMobileMenu()">
      <span class="material-symbols-outlined">event</span>
      Events
    </a>
    <a href="showcase.html" onclick="closeMobileMenu()">
      <span class="material-symbols-outlined">rocket_launch</span>
      Projects
    </a>
    <a href="contact.html" onclick="closeMobileMenu()">
      <span class="material-symbols-outlined">mail</span>
      Contact
    </a>
    <a href="merchandise.html" onclick="closeMobileMenu()">
      <span class="material-symbols-outlined">shopping_bag</span>
      Merchandise
    </a>
  </nav>
  <div class="menu-foot p-6">
    <a href="index.html#join" onclick="closeMobileMenu()" class="menu-join">
      <span class="material-symbols-outlined text-[18px]">person_add</span>
      Join the Hub
    </a>
  </div>
</div>
`;

// Inject mobile menu into the page body on load
function injectMobileMenu() {
  const temp = document.createElement('div');
  temp.innerHTML = MOBILE_MENU_HTML;
  while (temp.firstChild) {
    document.body.appendChild(temp.firstChild);
  }
}

// Auto-inject mobile menu
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectMobileMenu);
} else {
  injectMobileMenu();
}
