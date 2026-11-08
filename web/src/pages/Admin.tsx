// IEC JKUAT — Admin console. Ported from admin.html + admin.js.
// Full-screen chrome (own sidebar + topbar, NOT the public SiteLayout).
// Auth gate: Supabase Auth sign-in + admins-table membership check. Six tabs:
// Members, Events, Projects, Products, Messages, Payments — with add/edit/
// delete modals. Media uploads in the source used a storage helper + file
// pickers; here media/image URLs are managed via comma-separated URL inputs
// (the same JSON arrays are written to the DB), which keeps the data shape
// identical without the binary-upload UI.

import { useCallback, useEffect, useState, type FormEvent } from 'react';
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
  updateProject,
  getProjects,
  addProject,
  deleteProject,
  deleteEvent,
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getContactMessages,
  markMessageRead,
  deleteContactMessage,
  getPayments,
  supabase,
} from '../lib/supabase';
import { parseEmbedUrls } from '../lib/embeds';
import type { Member, EventRow, Project, Product, ContactMessage, Payment } from '../types/db';

type Tab = 'members' | 'events' | 'projects' | 'products' | 'messages' | 'payments';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'members', label: 'Members', icon: 'group' },
  { key: 'events', label: 'Events', icon: 'event' },
  { key: 'projects', label: 'Projects', icon: 'rocket_launch' },
  { key: 'products', label: 'Products', icon: 'shopping_bag' },
  { key: 'messages', label: 'Messages', icon: 'mail' },
  { key: 'payments', label: 'Payments', icon: 'payments' },
];

function jsonArray(csv: string): string {
  return JSON.stringify(
    csv
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

export default function Admin() {
  const [checking, setChecking] = useState(true);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  useEffect(() => {
    verifyAdminSession()
      .then((email) => setAdminEmail(email))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#07101a', color: 'rgba(255,255,255,0.4)' }}>
        <span className="material-symbols-outlined animate-spin mr-3">sync</span> Loading…
      </div>
    );
  }

  if (!adminEmail) {
    return <AdminLogin onSuccess={(email) => setAdminEmail(email)} />;
  }

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
      if (!verified) throw new Error('This account is not an admin.');
      onSuccess(verified);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#07101a' }}>
      <div className="w-full max-w-sm rounded-xl p-8" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h1 className="font-display font-bold text-white text-xl mb-1">IEC Admin</h1>
        <p className="text-xs text-white/40 mb-6">Admin Console — sign in required</p>
        <form onSubmit={handleSubmit}>
          <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5" htmlFor="admin-email">
            Email
          </label>
          <input
            id="admin-email"
            type="email"
            className="admin-input mb-4"
            placeholder="admin@example.com"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5" htmlFor="admin-password">
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            className="admin-input mb-5"
            placeholder="••••••••"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-red-400 text-xs mb-4">{error}</p>}
          <button type="submit" className="btn-primary w-full justify-center" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminApp({ adminEmail, onLogout }: { adminEmail: string; onLogout: () => void }) {
  const { toggle } = useTheme();
  const [tab, setTab] = useState<Tab>('members');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    await signOutAdmin();
    onLogout();
  }

  return (
    <div style={{ minHeight: '100vh', background: '#07101a', color: '#f0f0f0' }}>
      {/* Sidebar */}
      <aside id="sidebar" className={sidebarOpen ? 'open' : ''}>
        <div className="p-6">
          <h1 className="font-display font-bold text-white text-lg mb-8">
            IEC <span className="text-iec-blue">Admin</span>
          </h1>
          <nav className="space-y-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`tab-btn w-full ${tab === t.key ? 'active' : ''}`}
                onClick={() => {
                  setTab(t.key);
                  setSidebarOpen(false);
                }}
              >
                <span className="material-symbols-outlined">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>
      <div id="sidebar-overlay" className={sidebarOpen ? 'show' : ''} onClick={() => setSidebarOpen(false)} />

      {/* Main */}
      <div id="main" style={{ marginLeft: 220 }}>
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/6">
          <button className="md:hidden p-2 text-white/60" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-xs text-white/40">{adminEmail}</span>
            <button onClick={toggle} className="p-2 text-white/50 hover:text-white" title="Toggle theme" aria-label="Toggle theme">
              <span className="material-symbols-outlined">dark_mode</span>
            </button>
            <button onClick={handleLogout} className="btn-ghost-sm">
              <span className="material-symbols-outlined text-[13px]">logout</span> Logout
            </button>
          </div>
        </header>

        <main className="p-6">
          {tab === 'members' && <MembersTab />}
          {tab === 'events' && <EventsTab />}
          {tab === 'projects' && <ProjectsTab />}
          {tab === 'products' && <ProductsTab />}
          {tab === 'messages' && <MessagesTab />}
          {tab === 'payments' && <PaymentsTab />}
        </main>
      </div>
    </div>
  );
}

// ─── Shared confirm-delete modal ───
function useConfirmDelete() {
  const [pending, setPending] = useState<{ label: string; run: () => Promise<void> } | null>(null);
  const modal = pending ? (
    <div className="modal-backdrop" onClick={() => setPending(null)}>
      <div className="modal-box p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display font-bold text-white text-lg mb-2">Confirm delete</h3>
        <p className="text-white/60 text-sm mb-6">Delete "{pending.label}"? This cannot be undone.</p>
        <div className="flex gap-3 justify-end">
          <button className="btn-ghost-sm" onClick={() => setPending(null)}>
            Cancel
          </button>
          <button
            className="btn-danger"
            onClick={async () => {
              await pending.run();
              setPending(null);
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  ) : null;
  return { confirmDelete: (label: string, run: () => Promise<void>) => setPending({ label, run }), modal };
}

// ═══ MEMBERS ═══
function MembersTab() {
  const { toast } = useToast();
  const { confirmDelete, modal } = useConfirmDelete();
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Member | null>(null);

  const load = useCallback(() => {
    getMembers()
      .then(setMembers)
      .catch((e) => toast(e.message, 'error'));
  }, [toast]);
  useEffect(load, [load]);

  const q = search.toLowerCase();
  const filtered = members.filter(
    (m) =>
      !q ||
      (m.full_name || '').toLowerCase().includes(q) ||
      (m.reg_number || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      (m.phone || '').toLowerCase().includes(q)
  );
  const active = members.filter((m) => m.membership_status === 'active').length;

  async function activate(id: string) {
    try {
      await updateMember(id, { membership_status: 'active' });
      toast('Member activated!', 'success');
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display font-bold text-white text-2xl">Members</h2>
          <p className="text-white/40 text-sm">
            {filtered.length} of {members.length} · {active} active
          </p>
        </div>
        <input
          className="admin-input max-w-xs"
          placeholder="Search members…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="admin-card overflow-x-auto">
        <table className="admin-table w-full text-sm">
          <thead>
            <tr>
              <th>Name</th>
              <th>Reg No.</th>
              <th>College</th>
              <th>Course</th>
              <th>Year</th>
              <th>Phone</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-white/25 text-sm">
                  No members found
                </td>
              </tr>
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
                    <td>
                      <span className={`badge ${isActive ? 'badge-active' : 'badge-registered'}`}>
                        {isActive ? '✓ Active' : 'Registered'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn-ghost-sm" onClick={() => setEditing(m)} title="Edit">
                          <span className="material-symbols-outlined text-[13px]">edit</span>
                        </button>
                        {!isActive && (
                          <button className="btn-ghost-sm" onClick={() => activate(m.id)} title="Mark active">
                            <span className="material-symbols-outlined text-[13px]">verified</span>
                          </button>
                        )}
                        <button
                          className="btn-danger"
                          onClick={() =>
                            confirmDelete(m.full_name, async () => {
                              await deleteMember(m.id);
                              toast('Deleted!', 'success');
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
        <MemberModal
          member={editing}
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

function MemberModal({ member, onClose, onSaved }: { member: Member; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState(member);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Member) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateMember(member.id, {
        full_name: form.full_name,
        reg_number: form.reg_number,
        college: form.college,
        course: form.course,
        year_of_study: parseInt(String(form.year_of_study)) || undefined,
        phone: form.phone,
        email: form.email,
        membership_status: form.membership_status,
      });
      toast('Member updated!', 'success');
      onSaved();
    } catch (err) {
      toast((err as Error).message, 'error');
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal-box p-6" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <h2 className="font-display font-bold text-white text-lg mb-5">Edit Member</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name" value={form.full_name} onChange={set('full_name')} required />
          <Field label="Reg Number" value={form.reg_number} onChange={set('reg_number')} required />
          <Field label="College" value={form.college} onChange={set('college')} />
          <Field label="Course" value={form.course} onChange={set('course')} />
          <Field label="Year" type="number" value={String(form.year_of_study ?? '')} onChange={set('year_of_study')} />
          <Field label="Phone" value={form.phone} onChange={set('phone')} />
          <Field label="Email" type="email" value={form.email} onChange={set('email')} />
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Status</label>
            <select className="admin-input" value={form.membership_status} onChange={set('membership_status')}>
              <option value="registered">Registered</option>
              <option value="active">Active</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button type="button" className="btn-ghost-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ═══ EVENTS ═══
function EventsTab() {
  const { toast } = useToast();
  const { confirmDelete, modal } = useConfirmDelete();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [editing, setEditing] = useState<EventRow | null | 'new'>(null);

  const load = useCallback(() => {
    getEvents()
      .then(setEvents)
      .catch((e) => toast(e.message, 'error'));
  }, [toast]);
  useEffect(load, [load]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-bold text-white text-2xl">Events</h2>
        <button className="btn-primary" onClick={() => setEditing('new')}>
          <span className="material-symbols-outlined text-[16px]">add</span> New Event
        </button>
      </div>
      <div className="admin-card overflow-x-auto">
        <table className="admin-table w-full text-sm">
          <thead>
            <tr>
              <th>Title</th>
              <th>Date</th>
              <th>Category</th>
              <th>Location</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-white/25 text-sm">
                  No events yet. Add your first event.
                </td>
              </tr>
            ) : (
              events.map((ev) => (
                <tr key={ev.id}>
                  <td className="font-medium">{ev.title}</td>
                  <td className="text-white/60 text-sm whitespace-nowrap">
                    {ev.event_date ? new Date(ev.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td>{(ev as { category?: string }).category ? <span className="badge badge-registered">{(ev as { category?: string }).category}</span> : '—'}</td>
                  <td className="text-white/50 text-sm">{ev.location || '—'}</td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn-ghost-sm" onClick={() => setEditing(ev)}>
                        <span className="material-symbols-outlined text-[13px]">edit</span>
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() =>
                          confirmDelete(ev.title, async () => {
                            await deleteEvent(ev.id);
                            toast('Deleted!', 'success');
                            load();
                          })
                        }
                      >
                        <span className="material-symbols-outlined text-[13px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
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
  const [category, setCategory] = useState((event as { category?: string } | null)?.category || '');
  const [location, setLocation] = useState(event?.location || '');
  const [description, setDescription] = useState(event?.description || '');
  const [media, setMedia] = useState(() => {
    try {
      return (JSON.parse((event?.media_urls as string) || '[]') as string[]).join(', ');
    } catch {
      return '';
    }
  });
  const [embed, setEmbed] = useState(parseEmbedUrls(event?.embed_urls).join(', '));
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload: Partial<EventRow> & { category?: string | null } = {
        title: title.trim(),
        event_date: date,
        category: category || null,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        media_urls: jsonArray(media),
        embed_urls: jsonArray(embed),
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
      toast((err as Error).message, 'error');
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal-box p-6" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <h2 className="font-display font-bold text-white text-lg mb-5">{event ? 'Edit Event' : 'New Event'}</h2>
        <div className="space-y-4">
          <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            <Field label="Category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Hackathon" />
          </div>
          <Field label="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
          <TextArea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Field label="Image/Media URLs (comma-separated)" value={media} onChange={(e) => setMedia(e.target.value)} />
          <Field label="Embed Links (YouTube, etc.)" value={embed} onChange={(e) => setEmbed(e.target.value)} />
        </div>
        <ModalActions busy={busy} onClose={onClose} label="Save Event" />
      </form>
    </div>
  );
}

// ═══ PROJECTS ═══
function ProjectsTab() {
  const { toast } = useToast();
  const { confirmDelete, modal } = useConfirmDelete();
  const [projects, setProjects] = useState<Project[]>([]);
  const [editing, setEditing] = useState<Project | null | 'new'>(null);

  const load = useCallback(() => {
    getProjects()
      .then(setProjects)
      .catch((e) => toast(e.message, 'error'));
  }, [toast]);
  useEffect(load, [load]);

  const statusColors: Record<string, string> = { Ideation: 'badge-registered', Incubating: 'badge-active', 'MVP Live': 'badge-active' };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-bold text-white text-2xl">Projects</h2>
        <button className="btn-primary" onClick={() => setEditing('new')}>
          <span className="material-symbols-outlined text-[16px]">add</span> New Project
        </button>
      </div>
      <div className="admin-card overflow-x-auto">
        <table className="admin-table w-full text-sm">
          <thead>
            <tr>
              <th>Name</th>
              <th>Team Lead</th>
              <th>Category</th>
              <th>Status</th>
              <th>Progress</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-white/25 text-sm">
                  No projects yet.
                </td>
              </tr>
            ) : (
              projects.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.name}</td>
                  <td className="text-white/60">{p.team_lead}</td>
                  <td className="text-white/50 text-sm">{p.category || '—'}</td>
                  <td>
                    <span className={`badge ${statusColors[p.status || ''] || 'badge-registered'}`}>{p.status}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)', maxWidth: '80px' }}>
                        <div className="h-full rounded-full bg-iec-blue" style={{ width: `${p.progress || 0}%` }} />
                      </div>
                      <span className="text-xs text-white/40">{p.progress || 0}%</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn-ghost-sm" onClick={() => setEditing(p)}>
                        <span className="material-symbols-outlined text-[13px]">edit</span>
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() =>
                          confirmDelete(p.name, async () => {
                            await deleteProject(p.id);
                            toast('Deleted!', 'success');
                            load();
                          })
                        }
                      >
                        <span className="material-symbols-outlined text-[13px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
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
  const [progress, setProgress] = useState(String(project?.progress ?? ''));
  const [description, setDescription] = useState(project?.description || '');
  const [media, setMedia] = useState(() => {
    try {
      return (JSON.parse((project?.media_urls as string) || '[]') as string[]).join(', ');
    } catch {
      return '';
    }
  });
  const [embed, setEmbed] = useState(parseEmbedUrls(project?.embed_urls).join(', '));
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload: Partial<Project> = {
        name: name.trim(),
        team_lead: lead.trim(),
        status,
        category: category || undefined,
        progress: parseInt(progress) || 0,
        description: description.trim() || undefined,
        media_urls: jsonArray(media),
        embed_urls: jsonArray(embed),
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
      toast((err as Error).message, 'error');
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal-box p-6" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <h2 className="font-display font-bold text-white text-lg mb-5">{project ? 'Edit Project' : 'New Project'}</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Field label="Team Lead" value={lead} onChange={(e) => setLead(e.target.value)} required />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Status</label>
              <select className="admin-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option>Ideation</option>
                <option>Incubating</option>
                <option>MVP Live</option>
              </select>
            </div>
            <Field label="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
            <Field label="Progress %" type="number" value={progress} onChange={(e) => setProgress(e.target.value)} />
          </div>
          <TextArea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Field label="Image/Media URLs (comma-separated)" value={media} onChange={(e) => setMedia(e.target.value)} />
          <Field label="Embed Links" value={embed} onChange={(e) => setEmbed(e.target.value)} />
        </div>
        <ModalActions busy={busy} onClose={onClose} label="Save Project" />
      </form>
    </div>
  );
}

// ═══ PRODUCTS ═══
function ProductsTab() {
  const { toast } = useToast();
  const { confirmDelete, modal } = useConfirmDelete();
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | null | 'new'>(null);

  const load = useCallback(() => {
    getProducts()
      .then(setProducts)
      .catch((e) => toast(e.message, 'error'));
  }, [toast]);
  useEffect(load, [load]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-bold text-white text-2xl">Products</h2>
        <button className="btn-primary" onClick={() => setEditing('new')}>
          <span className="material-symbols-outlined text-[16px]">add</span> New Product
        </button>
      </div>
      <div className="admin-card overflow-x-auto">
        <table className="admin-table w-full text-sm">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Price</th>
              <th>Category</th>
              <th>Sizes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-white/25 text-sm">
                  No products yet.
                </td>
              </tr>
            ) : (
              products.map((p) => {
                let sizes: string[] = [];
                try {
                  sizes = JSON.parse((p.sizes as string) || '[]');
                } catch {
                  /* ignore */
                }
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
                    <td>
                      <div className="flex gap-1">
                        <button className="btn-ghost-sm" onClick={() => setEditing(p)}>
                          <span className="material-symbols-outlined text-[13px]">edit</span>
                        </button>
                        <button
                          className="btn-danger"
                          onClick={() =>
                            confirmDelete(p.name, async () => {
                              await deleteProduct(p.id);
                              toast('Deleted!', 'success');
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
  const [price, setPrice] = useState(String(product?.price ?? ''));
  const [category, setCategory] = useState(product?.category || 'Apparel');
  const [description, setDescription] = useState(product?.description || '');
  const [image, setImage] = useState(product?.image_url || '');
  const [sizes, setSizes] = useState(() => {
    try {
      return (JSON.parse((product?.sizes as string) || '[]') as string[]).join(',');
    } catch {
      return '';
    }
  });
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload: Partial<Product> = {
        name: name.trim(),
        price: parseInt(price) || 0,
        category,
        description: description.trim() || undefined,
        sizes: sizes.trim() ? JSON.stringify(sizes.split(',').map((s) => s.trim()).filter(Boolean)) : '[]',
        image_url: image || undefined,
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
      toast((err as Error).message, 'error');
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal-box p-6" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <h2 className="font-display font-bold text-white text-lg mb-5">{product ? 'Edit Product' : 'New Product'}</h2>
        <div className="space-y-4">
          <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Price (KES)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} required />
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Category</label>
              <select className="admin-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option>Apparel</option>
                <option>Accessories</option>
              </select>
            </div>
          </div>
          <Field label="Sizes (comma-separated)" value={sizes} onChange={(e) => setSizes(e.target.value)} placeholder="S,M,L,XL" />
          <TextArea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Field label="Image URL" value={image} onChange={(e) => setImage(e.target.value)} />
        </div>
        <ModalActions busy={busy} onClose={onClose} label="Save Product" />
      </form>
    </div>
  );
}

// ═══ MESSAGES ═══
function MessagesTab() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ContactMessage[]>([]);

  const load = useCallback(() => {
    getContactMessages()
      .then(setMessages)
      .catch((e) => toast(e.message, 'error'));
  }, [toast]);
  useEffect(load, [load]);

  const unread = messages.filter((m) => !m.is_read).length;

  async function toggleRead(m: ContactMessage) {
    try {
      if (!m.is_read) await markMessageRead(m.id);
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, is_read: !m.is_read } : x)));
      toast(m.is_read ? 'Marked as unread' : 'Marked as read', 'success');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  async function del(id: string) {
    if (!window.confirm('Delete this message?')) return;
    try {
      await deleteContactMessage(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      toast('Message deleted', 'success');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display font-bold text-white text-2xl">Messages</h2>
        <p className="text-white/40 text-sm">
          {messages.length} total · {unread} unread
        </p>
      </div>
      {messages.length === 0 ? (
        <div className="text-center py-16 text-white/25">
          <span className="material-symbols-outlined text-5xl mb-3 block opacity-40">inbox</span>
          <p className="text-sm">No messages yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => {
            const isUnread = !msg.is_read;
            const preview = (msg.message || '').substring(0, 120) + ((msg.message || '').length > 120 ? '…' : '');
            return (
              <div key={msg.id} className={`msg-card ${isUnread ? 'unread' : ''}`}>
                <div className="flex items-start justify-between gap-4 mb-2">
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
                  <div className="flex items-center gap-2 shrink-0">
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

// ═══ PAYMENTS ═══
function PaymentsTab() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    getPayments()
      .then(setPayments)
      .catch((e) => toast(e.message, 'error'));
  }, [toast]);

  const completed = payments.filter((p) => p.status === 'completed' || (p as { payment_status?: string }).payment_status === 'completed');
  const collected = completed.reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const statusOf = (p: Payment) => p.status || (p as { payment_status?: string }).payment_status || '';
  const badge = (s: string) =>
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
      <div className="mb-6">
        <h2 className="font-display font-bold text-white text-2xl">Payments</h2>
        <p className="text-white/40 text-sm">
          KES {collected.toLocaleString()} collected · {completed.length} paid
        </p>
      </div>
      <div className="admin-card overflow-x-auto">
        <table className="admin-table w-full text-sm">
          <thead>
            <tr>
              <th>Member</th>
              <th>Phone</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Ref</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-white/25 text-sm">
                  No payments yet.
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">
                    {p.members ? (
                      <>
                        {p.members.full_name} <span className="text-white/25 text-xs">· {p.members.reg_number}</span>
                      </>
                    ) : (
                      <span className="text-white/25 text-xs">—</span>
                    )}
                  </td>
                  <td className="text-white/60 text-sm">{p.phone || '—'}</td>
                  <td className="text-iec-blue font-semibold whitespace-nowrap">KES {(Number(p.amount) || 0).toLocaleString()}</td>
                  <td>{badge(statusOf(p))}</td>
                  <td className="text-white/40 text-xs font-mono truncate" style={{ maxWidth: '180px' }}>
                    {(p as { lipana_ref?: string }).lipana_ref || '—'}
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

// ─── Small form primitives ───
function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">{label}</label>
      <input className="admin-input" type={type} value={value} onChange={onChange} required={required} placeholder={placeholder} />
    </div>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (e: { target: { value: string } }) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">{label}</label>
      <textarea className="admin-input resize-none" rows={3} value={value} onChange={onChange} />
    </div>
  );
}

function ModalActions({ busy, onClose, label }: { busy: boolean; onClose: () => void; label: string }) {
  return (
    <div className="flex gap-3 justify-end mt-6">
      <button type="button" className="btn-ghost-sm" onClick={onClose}>
        Cancel
      </button>
      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? 'Saving…' : label}
      </button>
    </div>
  );
}
