// IEC JKUAT — Admin console. Ported from admin.html + admin.js.
// Full-screen chrome (own sidebar + top bar, not the public SiteLayout).
// Auth gate: Supabase Auth sign-in + admins-table membership check.
// Tabs: Members (stats, filters, CSV export), Events, Projects, Products
// (with photo/video uploads to Supabase Storage), Messages, Payments.
//
// JSONB list columns (media_urls, embed_urls, sizes) are read with
// parseJsonList(), which accepts both real arrays (seed rows) and JSON
// strings (rows saved by the old admin page), and written back as real
// arrays. Reading only strings would blank seed rows' media on save.

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import {
  signInAdmin,
  signOutAdmin,
  verifyAdminSession,
  getMembers,
  updateMember,
  deleteMember,
  getEvents,
  addEvent,
  deleteEvent,
  getProjects,
  addProject,
  updateProject,
  deleteProject,
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getContactMessages,
  markMessageRead,
  deleteContactMessage,
  getPayments,
  getMerchOrders,
  updateMerchOrderStatus,
  supabase,
} from '../lib/supabase';
import { parseJsonList } from '../lib/media';
import { parseEmbedUrls } from '../lib/embeds';
import { uploadMedia, isVideoUrl, STORAGE_BUCKETS } from '../lib/storage';
import { formatMerchOrderReference, getTimeAgo } from '../lib/format';
import type { Member, EventRow, Project, Product, ContactMessage, Payment, MerchOrder, MerchOrderStatus } from '../types/db';

type Tab = 'members' | 'events' | 'projects' | 'products' | 'orders' | 'messages' | 'payments';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'members', label: 'Members', icon: 'group' },
  { key: 'events', label: 'Events', icon: 'calendar_month' },
  { key: 'projects', label: 'Projects', icon: 'rocket_launch' },
  { key: 'products', label: 'Products', icon: 'storefront' },
  { key: 'orders', label: 'Orders', icon: 'receipt_long' },
  { key: 'messages', label: 'Messages', icon: 'mail' },
  { key: 'payments', label: 'Payments', icon: 'payments' },
];

const COLLEGES = ['COPAS', 'COETEC', 'COHES', 'COANRE', 'COHRED'];
const YEARS = ['1', '2', '3', '4', '5'];
const EVENT_CATEGORIES = ['Featured', 'Hackathon', 'Leadership', 'AgTech', 'Fintech', 'Networking', 'Workshop'];
const PROJECT_CATEGORIES = ['Fintech', 'AgTech', 'HealthTech', 'Social Impact', 'Education', 'Technology'];
const LABEL = 'block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5';

function splitList(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
}

// ═══════════════════════════════════════════════════
// AUTH GATE
// ═══════════════════════════════════════════════════
export default function Admin() {
  const [checking, setChecking] = useState(true);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  useEffect(() => {
    verifyAdminSession()
      .then((email) => setAdminEmail(email))
      .catch(() => setAdminEmail(null))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#07101a', color: 'rgba(255,255,255,0.4)' }}>
        <span className="material-symbols-outlined animate-spin mr-3">sync</span> Loading…
      </div>
    );
  }
  if (adminEmail === null) return <AdminLogin onSuccess={setAdminEmail} />;
  return <AdminApp adminEmail={adminEmail} onLogout={() => setAdminEmail(null)} />;
}

function AdminLogin({ onSuccess }: { onSuccess: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signInAdmin(email.trim(), password);
      const verified = await verifyAdminSession();
      if (verified === null) throw new Error('This account is not an admin.');
      onSuccess(verified);
    } catch (err) {
      setError(errMsg(err) || 'Sign-in failed.');
      setBusy(false);
    }
  }

  return (
    <div id="admin-login" className="fixed inset-0 z-[300] flex items-center justify-center px-4" style={{ background: '#07101a' }}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm p-8"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px' }}
      >
        <p className="font-display font-bold text-white text-base mb-1">
          IEC <span className="text-iec-blue">JKUAT</span>
        </p>
        <p className="text-xs text-white/40 mb-6">Admin Console — sign in required</p>
        <label className={LABEL} htmlFor="admin-email">Email</label>
        <input id="admin-email" type="email" className="admin-input mb-4" placeholder="admin@example.com" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className={LABEL} htmlFor="admin-password">Password</label>
        <input id="admin-password" type="password" className="admin-input mb-5" placeholder="••••••••" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-red-400 text-xs mb-4">{error}</p>}
        <button type="submit" className="btn-primary w-full justify-center" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// SHELL
// ═══════════════════════════════════════════════════
function AdminApp({ adminEmail, onLogout }: { adminEmail: string; onLogout: () => void }) {
  const { theme, toggle } = useTheme();
  const [tab, setTab] = useState<Tab>('members');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');

  const placeholder = `Search ${TABS.find((t) => t.key === tab)!.label.toLowerCase()}…`;
  const q = search.trim().toLowerCase();

  function switchTab(t: Tab) {
    setTab(t);
    setSearch('');
    setSidebarOpen(false);
  }

  async function handleLogout() {
    await signOutAdmin();
    onLogout();
  }

  return (
    <>
      <div id="sidebar-overlay" className={sidebarOpen ? 'show' : ''} onClick={() => setSidebarOpen(false)} />

      <aside id="sidebar" className={`py-5 px-3 flex flex-col ${sidebarOpen ? 'open' : ''}`}>
        <div className="px-3 mb-6">
          <Link to="/" className="font-display font-bold text-white text-base">
            IEC <span className="text-iec-blue">JKUAT</span>
          </Link>
          <p className="text-xs text-white/30 mt-0.5">Admin Console</p>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {TABS.map((t) => (
            <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => switchTab(t.key)}>
              <span className="material-symbols-outlined">{t.icon}</span> {t.label}
            </button>
          ))}
        </nav>
        <div className="px-3 mt-auto pt-4 border-t border-white/6 flex flex-col gap-2">
          <p className="px-4 text-[11px] text-white/30 truncate">{adminEmail}</p>
          <button className="tab-btn" onClick={handleLogout}>
            <span className="material-symbols-outlined">logout</span> Sign Out
          </button>
          <Link to="/" className="tab-btn">
            <span className="material-symbols-outlined">arrow_back</span> Back to Site
          </Link>
        </div>
      </aside>

      <div id="main" style={{ marginLeft: 220, minHeight: '100vh' }}>
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-6 py-4"
          style={{ background: 'rgba(7,16,26,0.8)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-white/50 hover:text-white" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-[16px]">search</span>
              <input
                type="text"
                className="admin-input pl-9 h-9 text-sm w-56 md:w-80"
                placeholder={placeholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggle} className="p-2 text-white/40 hover:text-white transition-colors" title="Toggle theme" aria-label="Toggle theme">
              <span className="material-symbols-outlined">{theme === 'light' ? 'dark_mode' : 'light_mode'}</span>
            </button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,174,239,0.12)', border: '1px solid rgba(0,174,239,0.25)' }}>
              <span className="material-symbols-outlined text-iec-blue text-[16px]">person</span>
            </div>
          </div>
        </header>

        <div className="p-6">
          {tab === 'members' && <MembersTab q={q} />}
          {tab === 'events' && <EventsTab q={q} />}
          {tab === 'projects' && <ProjectsTab q={q} />}
          {tab === 'products' && <ProductsTab q={q} />}
          {tab === 'orders' && <OrdersTab q={q} />}
          {tab === 'messages' && <MessagesTab q={q} />}
          {tab === 'payments' && <PaymentsTab q={q} />}
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════
// SHARED PIECES
// ═══════════════════════════════════════════════════
function ViewHeader({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="font-display font-bold text-white text-2xl">{title}</h1>
        <p className="text-white/40 text-sm mt-0.5">{subtitle}</p>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: ReactNode; color: string }) {
  return (
    <div className="admin-card p-4">
      <p className="text-white/35 text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className={`font-display font-bold text-2xl ${color}`}>{value}</p>
    </div>
  );
}

function EmptyRow({ cols, children }: { cols: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={cols} className="text-center py-10 text-white/25 text-sm">
        {children}
      </td>
    </tr>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box p-6 md:p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-display font-bold text-white text-xl">{title}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors" aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ busy, onClose, label }: { busy: boolean; onClose: () => void; label: string }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="submit" className="btn-primary flex-1 justify-center" disabled={busy}>
        <span className="material-symbols-outlined text-[16px]">save</span> {busy ? 'Saving…' : label}
      </button>
      <button type="button" onClick={onClose} className="btn-ghost-sm px-6">
        Cancel
      </button>
    </div>
  );
}

function useConfirmDelete() {
  const { toast } = useToast();
  const [pending, setPending] = useState<{ label: string; run: () => Promise<void> } | null>(null);
  const [busy, setBusy] = useState(false);
  const modal = pending ? (
    <div className="modal-backdrop" onClick={() => !busy && setPending(null)}>
      <div className="modal-box p-6 max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
        <span className="material-symbols-outlined text-red-400 text-5xl mb-3 block" style={{ fontVariationSettings: "'FILL' 1" }}>
          warning
        </span>
        <h3 className="font-display font-bold text-white text-lg mb-2">Confirm Delete</h3>
        <p className="text-white/45 text-sm mb-6">Delete "{pending.label}"? This cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={() => setPending(null)} className="btn-ghost-sm flex-1 justify-center" disabled={busy}>
            Cancel
          </button>
          <button
            className="btn-danger flex-1 justify-center py-2"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await pending.run();
                toast('Deleted!', 'success');
                setPending(null);
              } catch (e) {
                toast(errMsg(e), 'error');
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  ) : null;
  return { confirmDelete: (label: string, run: () => Promise<void>) => setPending({ label, run }), modal };
}

// Media picker: uploads files to a Storage bucket and keeps a URL list.
function MediaField({
  label,
  hint,
  icon,
  urls,
  onChange,
  bucket,
  folder,
  multiple,
  accept,
}: {
  label: string;
  hint: string;
  icon: string;
  urls: string[];
  onChange: (urls: string[]) => void;
  bucket: string;
  folder: string;
  multiple: boolean;
  accept: string;
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(0);
  // Uploads finish asynchronously; read the latest list, not a stale closure.
  const latest = useRef(urls);
  latest.current = urls;

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    for (const file of files) {
      setUploading((n) => n + 1);
      try {
        const url = await uploadMedia(file, bucket, folder);
        const next = multiple ? [...latest.current, url] : [url];
        latest.current = next;
        onChange(next);
      } catch (err) {
        toast('Upload failed: ' + errMsg(err), 'error');
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  return (
    <div>
      <label className={LABEL}>{label}</label>
      <label
        className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
        style={{ border: '2px dashed rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.02)' }}
      >
        <span className="material-symbols-outlined text-iec-blue text-[20px]">{icon}</span>
        <span className="text-sm text-white/50">{hint}</span>
        <input type="file" accept={accept} multiple={multiple} className="hidden" onChange={handleFiles} />
      </label>
      <div className="media-preview">
        {urls.map((url) => (
          <div key={url} className="media-thumb">
            {isVideoUrl(url) ? <video src={url} className="w-full h-full object-cover" /> : <img src={url} className="w-full h-full object-cover" alt="" />}
            <button type="button" className="remove-btn" onClick={() => onChange(latest.current.filter((u) => u !== url))} aria-label="Remove">
              ✕
            </button>
          </div>
        ))}
        {Array.from({ length: uploading }, (_, i) => (
          <div key={`up-${i}`} className="media-thumb">
            <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <span className="material-symbols-outlined animate-spin text-white/30 text-[18px]">sync</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  placeholder,
  hint,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className={LABEL}>
        {label}
        {required ? ' *' : ''}
        {hint && <span className="normal-case font-normal text-white/25"> {hint}</span>}
      </label>
      <input className="admin-input" type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder} />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className={LABEL}>
        {label}
        {required ? ' *' : ''}
      </label>
      <select className="admin-input" value={value} onChange={(e) => onChange(e.target.value)} required={required}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const opts = (xs: string[]) => xs.map((x) => ({ value: x, label: x }));

// ═══════════════════════════════════════════════════
// MEMBERS
// ═══════════════════════════════════════════════════
function MembersTab({ q }: { q: string }) {
  const { toast } = useToast();
  const { confirmDelete, modal } = useConfirmDelete();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [college, setCollege] = useState('');
  const [year, setYear] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<Member | null>(null);

  const load = useCallback(() => {
    getMembers()
      .then((m) => {
        setMembers(m);
        setLoadError('');
      })
      .catch((e) => setLoadError(errMsg(e)));
  }, []);
  useEffect(load, [load]);

  const all = members ?? [];
  const filtered = useMemo(
    () =>
      all.filter(
        (m) =>
          (!q ||
            (m.full_name || '').toLowerCase().includes(q) ||
            (m.reg_number || '').toLowerCase().includes(q) ||
            (m.email || '').toLowerCase().includes(q) ||
            (m.phone || '').toLowerCase().includes(q)) &&
          (!college || (m.college || '').includes(college)) &&
          (!year || String(m.year_of_study) === year) &&
          (!status || m.membership_status === status)
      ),
    [all, q, college, year, status]
  );

  const now = new Date();
  const active = all.filter((m) => m.membership_status === 'active').length;
  const thisMonth = all.filter((m) => {
    const d = new Date(m.created_at || '');
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  async function activate(id: string) {
    try {
      await updateMember(id, { membership_status: 'active' });
      setMembers((prev) => (prev ?? []).map((m) => (m.id === id ? { ...m, membership_status: 'active' } : m)));
      toast('Member activated!', 'success');
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  }

  function exportCSV() {
    const headers = ['Full Name', 'Reg Number', 'College', 'Course', 'Year', 'Phone', 'Email', 'Status', 'Joined'];
    const rows = filtered.map((m) => [
      m.full_name,
      m.reg_number,
      m.college,
      m.course,
      m.year_of_study,
      m.phone,
      m.email,
      m.membership_status,
      m.created_at ? new Date(m.created_at).toLocaleDateString('en-GB') : '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `iec-members-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <ViewHeader title="Members" subtitle="All registered IEC JKUAT members">
        <select className="admin-input h-9 text-sm w-auto" value={college} onChange={(e) => setCollege(e.target.value)} aria-label="Filter by college">
          <option value="">All Colleges</option>
          {COLLEGES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select className="admin-input h-9 text-sm w-auto" value={year} onChange={(e) => setYear(e.target.value)} aria-label="Filter by year">
          <option value="">All Years</option>
          {YEARS.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
        <select className="admin-input h-9 text-sm w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All Statuses</option>
          <option value="active">Active (Paid)</option>
          <option value="registered">Registered (Unpaid)</option>
        </select>
        <button onClick={exportCSV} className="btn-ghost-sm">
          <span className="material-symbols-outlined text-[15px]">download</span> Export CSV
        </button>
      </ViewHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total" value={members ? all.length : '—'} color="text-iec-blue" />
        <StatCard label="Active" value={members ? active : '—'} color="text-green-400" />
        <StatCard label="Pending" value={members ? all.length - active : '—'} color="text-iec-gold" />
        <StatCard label="This Month" value={members ? thisMonth : '—'} color="text-white" />
      </div>

      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Reg No.</th>
              <th>College</th>
              <th>Course</th>
              <th>Year</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Status</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loadError ? (
              <tr>
                <td colSpan={10} className="text-center py-8 text-red-400 text-sm">
                  Failed to load: {loadError}
                </td>
              </tr>
            ) : !members ? (
              <EmptyRow cols={10}>Loading members…</EmptyRow>
            ) : filtered.length === 0 ? (
              <EmptyRow cols={10}>No members found</EmptyRow>
            ) : (
              filtered.map((m) => {
                const isActive = m.membership_status === 'active';
                return (
                  <tr key={m.id}>
                    <td className="font-medium">{m.full_name}</td>
                    <td className="font-mono text-xs text-white/60">{m.reg_number}</td>
                    <td>{(m.college || '').split('—')[0].trim()}</td>
                    <td className="text-white/60">{m.course || '—'}</td>
                    <td className="text-center">{m.year_of_study || '—'}</td>
                    <td className="text-white/60">{m.phone || '—'}</td>
                    <td className="text-white/50 text-xs">{m.email || '—'}</td>
                    <td>
                      <span className={`badge ${isActive ? 'badge-active' : 'badge-registered'}`}>{isActive ? '✓ Active' : 'Registered'}</span>
                    </td>
                    <td className="text-white/40 text-xs whitespace-nowrap">
                      {m.created_at ? new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn-ghost-sm" onClick={() => setEditing(m)} title="Edit">
                          <span className="material-symbols-outlined text-[13px]">edit</span>
                        </button>
                        {!isActive && (
                          <button className="btn-ghost-sm" onClick={() => activate(m.id)} title="Mark as active">
                            <span className="material-symbols-outlined text-[13px]">verified</span>
                          </button>
                        )}
                        <button
                          className="btn-danger"
                          title="Delete"
                          onClick={() =>
                            confirmDelete(m.full_name, async () => {
                              await deleteMember(m.id);
                              setMembers((prev) => (prev ?? []).filter((x) => x.id !== m.id));
                            })
                          }
                        >
                          <span className="material-symbols-outlined text-[13px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {members && (
        <p className="text-white/25 text-xs mt-3">
          Showing {filtered.length} of {all.length} members
        </p>
      )}

      {editing && (
        <MemberModal
          member={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setMembers((prev) => (prev ?? []).map((m) => (m.id === updated.id ? updated : m)));
            setEditing(null);
          }}
        />
      )}
      {modal}
    </div>
  );
}

function MemberModal({ member, onClose, onSaved }: { member: Member; onClose: () => void; onSaved: (m: Member) => void }) {
  const { toast } = useToast();
  const [f, setF] = useState({
    full_name: member.full_name || '',
    reg_number: member.reg_number || '',
    phone: member.phone || '',
    email: member.email || '',
    college: member.college || '',
    course: member.course || '',
    year: member.year_of_study ? String(member.year_of_study) : '',
    membership_status: member.membership_status || 'registered',
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        full_name: f.full_name.trim(),
        reg_number: f.reg_number.trim(),
        college: f.college.trim(),
        course: f.course.trim(),
        phone: f.phone.trim(),
        email: f.email.trim(),
        membership_status: f.membership_status,
        ...(f.year ? { year_of_study: parseInt(f.year, 10) } : {}),
      };
      await updateMember(member.id, payload);
      toast('Member updated!', 'success');
      onSaved({ ...member, ...payload });
    } catch (err) {
      toast(errMsg(err), 'error');
      setBusy(false);
    }
  }

  return (
    <Modal title="Edit Member" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field className="col-span-2" label="Full Name" value={f.full_name} onChange={set('full_name')} required />
          <Field label="Reg Number" value={f.reg_number} onChange={set('reg_number')} required />
          <Field label="Phone" value={f.phone} onChange={set('phone')} required />
          <Field className="col-span-2" label="Email" type="email" value={f.email} onChange={set('email')} required />
          <Field label="College" value={f.college} onChange={set('college')} />
          <Field label="Course" value={f.course} onChange={set('course')} />
          <SelectField label="Year" value={f.year} onChange={set('year')} options={opts(YEARS)} placeholder="Select" />
          <SelectField
            label="Status"
            value={f.membership_status}
            onChange={set('membership_status')}
            options={[
              { value: 'registered', label: 'Registered (Unpaid)' },
              { value: 'active', label: 'Active (Paid)' },
            ]}
          />
        </div>
        <ModalActions busy={busy} onClose={onClose} label="Save Changes" />
      </form>
    </Modal>
  );
}

function isMerchOrderStatus(value: string): value is MerchOrderStatus {
  return value === 'pending' || value === 'confirmed' || value === 'fulfilled' || value === 'cancelled';
}

// ═══════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════
function EventsTab({ q }: { q: string }) {
  const { confirmDelete, modal } = useConfirmDelete();
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState<EventRow | 'new' | null>(null);

  const load = useCallback(() => {
    // admin.js listed newest event first; getEvents() is oldest-first.
    getEvents()
      .then((rows) => {
        setEvents([...rows].reverse());
        setLoadError('');
      })
      .catch((e) => setLoadError(errMsg(e)));
  }, []);
  useEffect(load, [load]);

  const list = (events ?? []).filter((ev) => !q || (ev.title || '').toLowerCase().includes(q) || (ev.location || '').toLowerCase().includes(q));

  return (
    <div>
      <ViewHeader title="Events" subtitle="Manage club events and programs">
        <button onClick={() => setEditing('new')} className="btn-primary">
          <span className="material-symbols-outlined text-[16px]">add</span> New Event
        </button>
      </ViewHeader>
      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Date</th>
              <th>Category</th>
              <th>Location</th>
              <th>Media</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loadError ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-red-400 text-sm">
                  {loadError}
                </td>
              </tr>
            ) : !events ? (
              <EmptyRow cols={6}>Loading events…</EmptyRow>
            ) : list.length === 0 ? (
              <EmptyRow cols={6}>No events yet. Add your first event.</EmptyRow>
            ) : (
              list.map((ev) => {
                const n = parseJsonList(ev.media_urls).length;
                return (
                  <tr key={ev.id}>
                    <td className="font-medium">{ev.title}</td>
                    <td className="text-white/60 text-sm whitespace-nowrap">
                      {ev.event_date ? new Date(ev.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td>{ev.category ? <span className="badge badge-registered">{ev.category}</span> : '—'}</td>
                    <td className="text-white/50 text-sm">{ev.location || '—'}</td>
                    <td className="text-white/40 text-xs">
                      {n} file{n !== 1 ? 's' : ''}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn-ghost-sm" onClick={() => setEditing(ev)} title="Edit">
                          <span className="material-symbols-outlined text-[13px]">edit</span>
                        </button>
                        <button
                          className="btn-danger"
                          title="Delete"
                          onClick={() =>
                            confirmDelete(ev.title, async () => {
                              await deleteEvent(ev.id);
                              load();
                            })
                          }
                        >
                          <span className="material-symbols-outlined text-[13px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {editing && (
        <EventModal
          event={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {modal}
    </div>
  );
}

function EventModal({ event, onClose, onSaved }: { event: EventRow | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [title, setTitle] = useState(event?.title || '');
  const [date, setDate] = useState(event?.event_date || '');
  const [category, setCategory] = useState(event?.category || '');
  const [location, setLocation] = useState(event?.location || '');
  const [description, setDescription] = useState(event?.description || '');
  const [embed, setEmbed] = useState(parseEmbedUrls(event?.embed_urls).join(', '));
  const [media, setMedia] = useState<string[]>(parseJsonList(event?.media_urls));
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload: Partial<EventRow> = {
        title: title.trim(),
        event_date: date,
        category: category || null,
        location: location.trim() || null,
        description: description.trim() || null,
        media_urls: media,
        embed_urls: splitList(embed),
      };
      if (event) {
        const { error } = await supabase.from('events').update(payload).eq('id', event.id);
        if (error) throw error;
        toast('Event updated!', 'success');
      } else {
        await addEvent(payload);
        toast('Event created!', 'success');
      }
      onSaved();
    } catch (err) {
      toast(errMsg(err), 'error');
      setBusy(false);
    }
  }

  return (
    <Modal title={event ? 'Edit Event' : 'New Event'} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Title" value={title} onChange={setTitle} required placeholder="e.g. IEC Innovation Night" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date" type="date" value={date} onChange={setDate} required />
          <SelectField label="Category" value={category} onChange={setCategory} options={opts(EVENT_CATEGORIES)} placeholder="Select" />
        </div>
        <Field label="Location" value={location} onChange={setLocation} placeholder="e.g. JKUAT Innovation Hub" />
        <div>
          <label className={LABEL}>Description</label>
          <textarea className="admin-input resize-none" rows={3} placeholder="What's this event about?" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <Field label="Embed Link" hint="(YouTube, Instagram, etc. — comma-separate several)" value={embed} onChange={setEmbed} placeholder="https://youtube.com/watch?v=..." />
        <MediaField
          label="Photos & Videos"
          hint="Click to upload images or videos"
          icon="upload"
          urls={media}
          onChange={setMedia}
          bucket={STORAGE_BUCKETS.event}
          folder="event"
          multiple
          accept="image/*,video/mp4,video/webm"
        />
        <ModalActions busy={busy} onClose={onClose} label="Save Event" />
      </form>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════
// PROJECTS
// ═══════════════════════════════════════════════════
const STATUS_BADGE: Record<string, string> = { Ideation: 'badge-registered', Incubating: 'badge-active', 'MVP Live': 'badge-active' };

function ProjectsTab({ q }: { q: string }) {
  const { confirmDelete, modal } = useConfirmDelete();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState<Project | 'new' | null>(null);

  const load = useCallback(() => {
    getProjects()
      .then((rows) => {
        setProjects(rows);
        setLoadError('');
      })
      .catch((e) => setLoadError(errMsg(e)));
  }, []);
  useEffect(load, [load]);

  const list = (projects ?? []).filter((p) => !q || (p.name || '').toLowerCase().includes(q) || (p.team_lead || '').toLowerCase().includes(q));

  return (
    <div>
      <ViewHeader title="Projects" subtitle="Incubated startups and ventures">
        <button onClick={() => setEditing('new')} className="btn-primary">
          <span className="material-symbols-outlined text-[16px]">add</span> New Project
        </button>
      </ViewHeader>
      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Team Lead</th>
              <th>Category</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Media</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loadError ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-red-400 text-sm">
                  {loadError}
                </td>
              </tr>
            ) : !projects ? (
              <EmptyRow cols={7}>Loading projects…</EmptyRow>
            ) : list.length === 0 ? (
              <EmptyRow cols={7}>No projects yet.</EmptyRow>
            ) : (
              list.map((p) => {
                const n = parseJsonList(p.media_urls).length;
                return (
                  <tr key={p.id}>
                    <td className="font-medium">{p.name}</td>
                    <td className="text-white/60">{p.team_lead}</td>
                    <td className="text-white/50 text-sm">{p.category || '—'}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[p.status || ''] || 'badge-registered'}`}>{p.status}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)', maxWidth: '80px' }}>
                          <div className="h-full rounded-full bg-iec-blue" style={{ width: `${p.progress || 0}%` }} />
                        </div>
                        <span className="text-xs text-white/40">{p.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="text-white/40 text-xs">
                      {n} file{n !== 1 ? 's' : ''}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn-ghost-sm" onClick={() => setEditing(p)} title="Edit">
                          <span className="material-symbols-outlined text-[13px]">edit</span>
                        </button>
                        <button
                          className="btn-danger"
                          title="Delete"
                          onClick={() =>
                            confirmDelete(p.name, async () => {
                              await deleteProject(p.id);
                              load();
                            })
                          }
                        >
                          <span className="material-symbols-outlined text-[13px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {editing && (
        <ProjectModal
          project={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {modal}
    </div>
  );
}

function ProjectModal({ project, onClose, onSaved }: { project: Project | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState(project?.name || '');
  const [lead, setLead] = useState(project?.team_lead || '');
  const [status, setStatus] = useState(project?.status || 'Ideation');
  const [category, setCategory] = useState(project?.category || '');
  const [progress, setProgress] = useState(project?.progress ? String(project.progress) : '');
  const [description, setDescription] = useState(project?.description || '');
  const [embed, setEmbed] = useState(parseEmbedUrls(project?.embed_urls).join(', '));
  const [media, setMedia] = useState<string[]>(parseJsonList(project?.media_urls));
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const pct = Math.min(100, Math.max(0, parseInt(progress, 10) || 0));
      const payload: Partial<Project> = {
        name: name.trim(),
        team_lead: lead.trim(),
        status,
        category: category || undefined,
        progress: pct,
        description: description.trim() || undefined,
        media_urls: media,
        embed_urls: splitList(embed),
      };
      if (project) {
        await updateProject(project.id, payload);
        toast('Project updated!', 'success');
      } else {
        await addProject(payload);
        toast('Project created!', 'success');
      }
      onSaved();
    } catch (err) {
      toast(errMsg(err), 'error');
      setBusy(false);
    }
  }

  return (
    <Modal title={project ? 'Edit Project' : 'New Project'} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Project Name" value={name} onChange={setName} required placeholder="e.g. EcoTrack" />
          <Field label="Team Lead" value={lead} onChange={setLead} required placeholder="Full name" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Status" value={status} onChange={setStatus} options={opts(['Ideation', 'Incubating', 'MVP Live'])} required />
          <SelectField label="Category" value={category} onChange={setCategory} options={opts(PROJECT_CATEGORIES)} placeholder="Select" />
        </div>
        <Field label="Progress (0–100)" type="number" value={progress} onChange={setProgress} placeholder="e.g. 65" />
        <div>
          <label className={LABEL}>Description</label>
          <textarea className="admin-input resize-none" rows={3} placeholder="What problem does it solve?" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <Field label="Embed Link" hint="(YouTube, etc. — comma-separate several)" value={embed} onChange={setEmbed} placeholder="https://youtube.com/watch?v=..." />
        <MediaField
          label="Photos & Videos"
          hint="Click to upload images or videos"
          icon="upload"
          urls={media}
          onChange={setMedia}
          bucket={STORAGE_BUCKETS.project}
          folder="project"
          multiple
          accept="image/*,video/mp4,video/webm"
        />
        <ModalActions busy={busy} onClose={onClose} label="Save Project" />
      </form>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════════
function ProductsTab({ q }: { q: string }) {
  const { confirmDelete, modal } = useConfirmDelete();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState<Product | 'new' | null>(null);

  const load = useCallback(() => {
    getProducts()
      .then((rows) => {
        setProducts(rows);
        setLoadError('');
      })
      .catch((e) => setLoadError(errMsg(e)));
  }, []);
  useEffect(load, [load]);

  const list = (products ?? []).filter((p) => !q || (p.name || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q));

  return (
    <div>
      <ViewHeader title="Products" subtitle="Merchandise catalogue">
        <button onClick={() => setEditing('new')} className="btn-primary">
          <span className="material-symbols-outlined text-[16px]">add</span> New Product
        </button>
      </ViewHeader>
      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Price</th>
              <th>Category</th>
              <th>Sizes</th>
              <th>Members Only</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loadError ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-red-400 text-sm">
                  {loadError}
                </td>
              </tr>
            ) : !products ? (
              <EmptyRow cols={7}>Loading products…</EmptyRow>
            ) : list.length === 0 ? (
              <EmptyRow cols={7}>No products yet.</EmptyRow>
            ) : (
              list.map((p) => {
                const sizes = parseJsonList(p.sizes);
                return (
                  <tr key={p.id}>
                    <td>
                      {p.image_url ? (
                        <img src={p.image_url} className="w-10 h-10 rounded object-cover" alt="" />
                      ) : (
                        <div className="w-10 h-10 rounded flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <span className="material-symbols-outlined text-white/25 text-[18px]">image</span>
                        </div>
                      )}
                    </td>
                    <td className="font-medium">{p.name}</td>
                    <td className="text-iec-blue font-semibold">KES {(p.price || 0).toLocaleString()}</td>
                    <td className="text-white/50 text-sm">{p.category}</td>
                    <td className="text-white/40 text-xs">{sizes.length ? sizes.join(', ') : '—'}</td>
                    <td>{p.is_member_exclusive ? <span className="badge badge-active text-[10px]">Yes</span> : <span className="text-white/25 text-xs">No</span>}</td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn-ghost-sm" onClick={() => setEditing(p)} title="Edit">
                          <span className="material-symbols-outlined text-[13px]">edit</span>
                        </button>
                        <button
                          className="btn-danger"
                          title="Delete"
                          onClick={() =>
                            confirmDelete(p.name, async () => {
                              await deleteProduct(p.id);
                              load();
                            })
                          }
                        >
                          <span className="material-symbols-outlined text-[13px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {editing && (
        <ProductModal
          product={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {modal}
    </div>
  );
}

function ProductModal({ product, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState(product?.name || '');
  const [price, setPrice] = useState(product?.price ? String(product.price) : '');
  const [category, setCategory] = useState(product?.category || 'Apparel');
  const [sizes, setSizes] = useState(parseJsonList(product?.sizes).join(','));
  const [description, setDescription] = useState(product?.description || '');
  const [exclusive, setExclusive] = useState(Boolean(product?.is_member_exclusive));
  const [image, setImage] = useState<string[]>(product?.image_url ? [product.image_url] : []);
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload: Partial<Product> = {
        name: name.trim(),
        price: parseInt(price, 10),
        category,
        description: description.trim() || null,
        is_member_exclusive: exclusive,
        sizes: splitList(sizes),
        image_url: image[0] || null,
      };
      if (product) {
        await updateProduct(product.id, payload);
        toast('Product updated!', 'success');
      } else {
        await addProduct(payload);
        toast('Product created!', 'success');
      }
      onSaved();
    } catch (err) {
      toast(errMsg(err), 'error');
      setBusy(false);
    }
  }

  return (
    <Modal title={product ? 'Edit Product' : 'New Product'} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Product Name" value={name} onChange={setName} required placeholder="e.g. IEC Signature Hoodie" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Price (KES)" type="number" value={price} onChange={setPrice} required placeholder="e.g. 2500" />
          <SelectField label="Category" value={category} onChange={setCategory} options={opts(['Apparel', 'Accessories'])} required />
        </div>
        <Field label="Sizes" hint="(comma separated, e.g. S,M,L,XL)" value={sizes} onChange={setSizes} placeholder="S,M,L,XL,XXL" />
        <div>
          <label className={LABEL}>Description</label>
          <textarea className="admin-input resize-none" rows={2} placeholder="Short product description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" id="product-exclusive" className="w-4 h-4 rounded accent-iec-blue" checked={exclusive} onChange={(e) => setExclusive(e.target.checked)} />
          <label htmlFor="product-exclusive" className="text-sm text-white/60">
            Members Only (exclusive drop)
          </label>
        </div>
        <MediaField
          label="Product Image"
          hint="Click to upload product image"
          icon="add_photo_alternate"
          urls={image}
          onChange={setImage}
          bucket={STORAGE_BUCKETS.product}
          folder="products"
          multiple={false}
          accept="image/*"
        />
        <ModalActions busy={busy} onClose={onClose} label="Save Product" />
      </form>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════
// MERCHANDISE ORDERS
// ═══════════════════════════════════════════════════
function OrdersTab({ q }: { q: string }) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<MerchOrder[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(() => {
    getMerchOrders()
      .then((rows) => {
        setOrders(rows);
        setLoadError('');
      })
      .catch((error) => setLoadError(errMsg(error)));
  }, []);
  useEffect(load, [load]);

  const all = orders ?? [];
  const pending = all.filter((order) => order.status === 'pending');
  const confirmed = all.filter((order) => order.status === 'confirmed');
  const fulfilled = all.filter((order) => order.status === 'fulfilled');
  const list = all.filter((order) => {
    if (!q) return true;
    const itemText = (order.items ?? []).map((item) => `${item.product_name} ${item.size ?? ''}`).join(' ');
    return [order.id, order.customer_name, order.customer_phone, itemText]
      .some((value) => value.toLowerCase().includes(q));
  });

  async function changeStatus(order: MerchOrder, status: MerchOrderStatus) {
    if (status === order.status) return;
    setUpdatingId(order.id);
    try {
      await updateMerchOrderStatus(order.id, status);
      setOrders((current) => (current ?? []).map((row) => row.id === order.id ? { ...row, status } : row));
      toast('Order status updated', 'success');
    } catch (error) {
      toast(errMsg(error), 'error');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <ViewHeader title="Merchandise Orders" subtitle="Customer details, ordered items, totals, and fulfilment status">
        <button onClick={load} className="btn-ghost-sm">
          <span className="material-symbols-outlined text-[15px]">refresh</span> Refresh
        </button>
      </ViewHeader>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total orders" value={orders ? all.length : '—'} color="text-iec-blue" />
        <StatCard label="Pending confirmation" value={orders ? pending.length : '—'} color="text-iec-gold" />
        <StatCard label="Confirmed" value={orders ? confirmed.length : '—'} color="text-green-400" />
        <StatCard label="Fulfilled" value={orders ? fulfilled.length : '—'} color="text-white" />
      </div>
      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loadError ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-red-400 text-sm">
                  Failed to load orders: {loadError}
                </td>
              </tr>
            ) : !orders ? (
              <EmptyRow cols={6}>Loading orders…</EmptyRow>
            ) : list.length === 0 ? (
              <EmptyRow cols={6}>No merchandise orders yet.</EmptyRow>
            ) : (
              list.map((order) => {
                const reference = formatMerchOrderReference(order.id);
                return (
                  <tr key={order.id}>
                    <td>
                      <p className="font-semibold text-white">{reference}</p>
                      <p className="text-white/30 text-[10px] font-mono">{order.id}</p>
                    </td>
                    <td>
                      <p className="font-medium">{order.customer_name}</p>
                      <a className="text-iec-blue text-xs hover:underline" href={`tel:${order.customer_phone}`}>
                        {order.customer_phone}
                      </a>
                    </td>
                    <td>
                      <div className="space-y-1 min-w-[180px]">
                        {(order.items ?? []).map((item) => (
                          <p key={item.id} className="text-xs text-white/65">
                            {item.quantity}× {item.product_name}
                            {item.size ? <span className="text-white/35"> · Size {item.size}</span> : null}
                            <span className="block text-white/35">KES {(item.unit_price * item.quantity).toLocaleString()}</span>
                          </p>
                        ))}
                      </div>
                    </td>
                    <td className="text-white font-semibold whitespace-nowrap">
                      KES {Number(order.total_amount).toLocaleString()}
                    </td>
                    <td>
                      <select
                        className="admin-input h-9 text-xs min-w-[145px]"
                        aria-label={`Update status for ${reference}`}
                        value={order.status}
                        disabled={updatingId === order.id}
                        onChange={(event) => {
                          const status = event.target.value;
                          if (isMerchOrderStatus(status)) void changeStatus(order, status);
                        }}
                      >
                        <option value="pending">Pending confirmation</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="fulfilled">Fulfilled</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="text-white/40 text-xs whitespace-nowrap">
                      {order.created_at
                        ? new Date(order.created_at).toLocaleString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {orders && all.length > 0 && (
        <p className="text-white/30 text-xs mt-3">
          New orders are saved as pending; update the status after confirming payment or fulfilment.
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════════════════
function MessagesTab({ q }: { q: string }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(() => {
    getContactMessages()
      .then((rows) => {
        setMessages(rows);
        setLoadError('');
      })
      .catch((e) => setLoadError(errMsg(e)));
  }, []);
  useEffect(load, [load]);

  const all = messages ?? [];
  const today = new Date().toISOString().split('T')[0];
  const list = all.filter(
    (m) => !q || [m.name, m.email, m.subject, m.message].some((v) => (v || '').toLowerCase().includes(q))
  );

  async function toggleRead(m: ContactMessage) {
    try {
      // Same as admin.js: only "mark read" is persisted.
      if (!m.is_read) await markMessageRead(m.id);
      setMessages((prev) => (prev ?? []).map((x) => (x.id === m.id ? { ...x, is_read: !m.is_read } : x)));
      toast(m.is_read ? 'Marked as unread' : 'Marked as read', 'success');
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  }

  async function del(id: string) {
    if (!window.confirm('Delete this message?')) return;
    try {
      await deleteContactMessage(id);
      setMessages((prev) => (prev ?? []).filter((m) => m.id !== id));
      toast('Message deleted', 'success');
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  }

  return (
    <div>
      <ViewHeader title="Messages" subtitle="Contact form submissions">
        <button onClick={load} className="btn-ghost-sm">
          <span className="material-symbols-outlined text-[15px]">refresh</span> Refresh
        </button>
      </ViewHeader>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total" value={messages ? all.length : '—'} color="text-iec-blue" />
        <StatCard label="Unread" value={messages ? all.filter((m) => !m.is_read).length : '—'} color="text-iec-gold" />
        <StatCard label="Today" value={messages ? all.filter((m) => (m.created_at || '').startsWith(today)).length : '—'} color="text-green-400" />
      </div>

      {loadError ? (
        <div className="text-center py-10 text-red-400 text-sm">Failed to load messages: {loadError}</div>
      ) : !messages ? (
        <div className="text-center py-10 text-white/25 text-sm">Loading messages…</div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-white/25">
          <span className="material-symbols-outlined text-5xl mb-3 block opacity-40">inbox</span>
          <p className="text-sm">No messages yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((msg) => {
            const isUnread = !msg.is_read;
            const text = msg.message || '';
            const preview = text.substring(0, 120) + (text.length > 120 ? '…' : '');
            return (
              <div key={msg.id} className={`msg-card ${isUnread ? 'unread' : ''}`}>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: isUnread ? 'rgba(0,174,239,0.12)' : 'rgba(255,255,255,0.06)' }}>
                      <span className="material-symbols-outlined text-[16px]" style={{ color: isUnread ? '#18C8FF' : 'rgba(255,255,255,0.3)' }}>
                        person
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="msg-from font-semibold text-sm text-white">{msg.name}</span>
                        <span className="text-white/25 text-xs">•</span>
                        <span className="text-white/30 text-xs">{msg.email}</span>
                      </div>
                      <p className="msg-subject text-sm font-medium mt-0.5" style={{ color: isUnread ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                        {msg.subject}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-white/25 text-xs whitespace-nowrap">{msg.created_at ? getTimeAgo(new Date(msg.created_at)) : ''}</span>
                    <button onClick={() => toggleRead(msg)} className="p-1.5 rounded hover:bg-white/5 transition-colors" title={isUnread ? 'Mark as read' : 'Mark as unread'}>
                      <span className="material-symbols-outlined text-[16px]" style={{ color: isUnread ? '#18C8FF' : 'rgba(255,255,255,0.3)' }}>
                        {isUnread ? 'mark_email_read' : 'mark_email_unread'}
                      </span>
                    </button>
                    <button onClick={() => del(msg.id)} className="p-1.5 rounded hover:bg-white/5 transition-colors" title="Delete">
                      <span className="material-symbols-outlined text-[16px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        delete
                      </span>
                    </button>
                  </div>
                </div>
                <p className="msg-preview text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {preview}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════
function PaymentsTab({ q }: { q: string }) {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(() => {
    getPayments()
      .then((rows) => {
        setPayments(rows);
        setLoadError('');
      })
      .catch((e) => setLoadError(errMsg(e)));
  }, []);
  useEffect(load, [load]);

  const all = payments ?? [];
  const completed = all.filter((p) => p.payment_status === 'completed');
  const pending = all.filter((p) => p.payment_status === 'pending');
  const failed = all.filter((p) => p.payment_status !== 'completed' && p.payment_status !== 'pending');
  const collected = completed.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const list = all.filter(
    (p) => !q || [p.members?.full_name, p.members?.reg_number, p.phone, p.lipana_ref].some((v) => (v || '').toLowerCase().includes(q))
  );

  const badge = (s?: string) =>
    s === 'completed' ? (
      <span className="badge badge-active">Paid</span>
    ) : s === 'pending' ? (
      <span className="badge badge-registered">Pending</span>
    ) : (
      <span className="badge" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
        Failed
      </span>
    );

  return (
    <div>
      <ViewHeader title="Payments" subtitle="M-Pesa collections — who has paid the membership fee">
        <button onClick={load} className="btn-ghost-sm">
          <span className="material-symbols-outlined text-[15px]">refresh</span> Refresh
        </button>
      </ViewHeader>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Collected" value={payments ? `KES ${collected.toLocaleString()}` : '—'} color="text-iec-blue" />
        <StatCard label="Completed" value={payments ? completed.length : '—'} color="text-green-400" />
        <StatCard label="Pending" value={payments ? pending.length : '—'} color="text-iec-gold" />
        <StatCard label="Failed" value={payments ? failed.length : '—'} color="text-red-400" />
      </div>
      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Phone</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Reference</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loadError ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-red-400 text-sm">
                  Failed to load: {loadError}
                </td>
              </tr>
            ) : !payments ? (
              <EmptyRow cols={6}>Loading payments…</EmptyRow>
            ) : list.length === 0 ? (
              <EmptyRow cols={6}>No payments yet.</EmptyRow>
            ) : (
              list.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">
                    {p.members ? (
                      <>
                        {p.members.full_name} <span className="text-white/25 text-xs">· {p.members.reg_number || ''}</span>
                      </>
                    ) : (
                      <span className="text-white/25 text-xs">—</span>
                    )}
                  </td>
                  <td className="text-white/60 text-sm">{p.phone || '—'}</td>
                  <td className="text-iec-blue font-semibold whitespace-nowrap">KES {(Number(p.amount) || 0).toLocaleString()}</td>
                  <td>{badge(p.payment_status)}</td>
                  <td className="text-white/40 text-xs font-mono truncate" style={{ maxWidth: '180px' }} title={p.lipana_ref || ''}>
                    {p.lipana_ref || '—'}
                  </td>
                  <td className="text-white/40 text-xs whitespace-nowrap">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
