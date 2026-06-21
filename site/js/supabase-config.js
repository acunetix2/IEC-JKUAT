// IEC JKUAT - Supabase Configuration
// Shared config and utilities for all pages

const SUPABASE_URL = 'https://gakuuxwhlczhlgngcdrv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdha3V1eHdobGN6aGxnbmdjZHJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzUyODksImV4cCI6MjA4MTY1MTI4OX0.wbgJik7A6qasB8FMEWZqZka8CEpZyUrSw-Ma2oLZZwM';

// Initialize Supabase client (loaded from CDN in HTML)
let supabaseClient = null;

function initSupabase() {
  if (typeof supabase !== 'undefined' && !supabaseClient) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

// ===== Form Utilities =====

// Submit member registration to Supabase
async function submitMemberRegistration(formData) {
  const sb = initSupabase();
  if (!sb) throw new Error('Supabase not loaded');
  
  const { data, error } = await sb.from('members').insert([
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
  ]).select();
  
  if (error) throw error;
  return data;
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
async function getMembers(search = '') {
  const sb = initSupabase();
  let query = sb.from('members').select('*').order('created_at', { ascending: false });
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

// Get member signup stats by month (for growth chart)
async function getMemberGrowth() {
  const sb = initSupabase();
  const { data, error } = await sb.from('members').select('created_at');
  if (error) throw error;
  
  // Group by month
  const months = {};
  const monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  data.forEach(m => {
    const d = new Date(m.created_at);
    const key = d.getMonth();
    months[key] = (months[key] || 0) + 1;
  });
  
  const maxVal = Math.max(...Object.values(months), 1);
  return monthNames.map((name, i) => ({
    label: name,
    count: months[i] || 0,
    height: Math.max(5, ((months[i] || 0) / maxVal) * 100)
  }));
}

// Get recent activity (combines recent members + projects)
async function getRecentActivity(limit = 5) {
  const sb = initSupabase();
  const { data: recentMembers } = await sb.from('members')
    .select('id, full_name, college, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  const { data: recentProjects } = await sb.from('projects')
    .select('id, name, status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  const activities = [];
  
  (recentMembers || []).forEach(m => {
    activities.push({
      type: 'member',
      icon: 'person_add',
      iconBg: 'bg-tech-blue/10',
      iconColor: 'text-tech-blue',
      title: 'New Member Registered',
      desc: `${m.full_name} joined the club`,
      time: formatTimeAgo(m.created_at)
    });
  });
  
  (recentProjects || []).forEach(p => {
    activities.push({
      type: 'project',
      icon: p.status === 'Incubating' ? 'verified' : 'rocket_launch',
      iconBg: 'bg-jkuat-green/10',
      iconColor: 'text-jkuat-green',
      title: `Project: ${p.name}`,
      desc: `Status changed to ${p.status}`,
      time: formatTimeAgo(p.created_at)
    });
  });
  
  activities.sort((a, b) => new Date(b.rawTime || 0) - new Date(a.rawTime || 0));
  return activities.slice(0, limit);
}

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
const MOBILE_MENU_HTML = `
<div id="mobile-overlay" class="fixed inset-0 bg-black/40 z-40 hidden md:hidden" onclick="closeMobileMenu()"></div>
<div id="mobile-menu" class="fixed top-0 right-0 h-full w-72 bg-white z-50 shadow-2xl translate-x-full transition-transform duration-300 ease-in-out md:hidden">
  <div class="flex justify-between items-center p-6 border-b border-outline-variant/30">
    <span class="font-headline-md font-bold text-jkuat-green">IEC JKUAT</span>
    <button onclick="closeMobileMenu()" class="p-2 text-on-surface-variant hover:text-tech-blue">
      <span class="material-symbols-outlined">close</span>
    </button>
  </div>
  <nav class="p-6 flex flex-col gap-2">
    <a href="index.html" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-container-low text-on-surface font-body-md transition-colors">
      <span class="material-symbols-outlined text-tech-blue text-xl">home</span>
      Venture First
    </a>
    <a href="events.html" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-container-low text-on-surface font-body-md transition-colors">
      <span class="material-symbols-outlined text-tech-blue text-xl">event</span>
      Programs
    </a>
    <a href="showcase.html" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-container-low text-on-surface font-body-md transition-colors">
      <span class="material-symbols-outlined text-tech-blue text-xl">rocket_launch</span>
      Showcase
    </a>
    <a href="community.html" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-container-low text-on-surface font-body-md transition-colors">
      <span class="material-symbols-outlined text-tech-blue text-xl">groups</span>
      Community
    </a>
    <a href="merchandise.html" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-container-low text-on-surface font-body-md transition-colors">
      <span class="material-symbols-outlined text-tech-blue text-xl">shopping_bag</span>
      Merchandise
    </a>
    <hr class="my-4 border-outline-variant/30"/>
    <a href="admin.html" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-container-low text-on-surface font-body-md transition-colors">
      <span class="material-symbols-outlined text-jkuat-gold text-xl">dashboard</span>
      Admin
    </a>
  </nav>
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
