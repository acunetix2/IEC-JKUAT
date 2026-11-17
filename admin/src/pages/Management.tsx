import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  FiArrowDown, FiArrowUp, FiBriefcase, FiCalendar, FiCheck, FiChevronDown, FiEdit2, FiExternalLink,
  FiCreditCard, FiInbox, FiInfo, FiMail, FiPlus, FiShoppingBag, FiTrash2, FiUpload, FiUserPlus, FiUsers, FiX, FiPackage,
} from 'react-icons/fi';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { adminApi, publicImageUrl, uploadImage } from '../lib/api';
import type {
  AdminProfile, AdminView, ContactMessage, EventRecord, Executive, Member, PaginatedMembers,
  MerchOrder, MerchOrderStatus, Payment, ProductRecord, Project,
} from '../types';
import { mediaUrls, stringList } from '../types';
import Notice from '../components/Notice';
import EmptyState from '../components/EmptyState';
import AdminTools from './AdminTools';

const dateLabel = (value?: string) => value
  ? new Date(value).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—';
const money = (value: number) => `KES ${Number(value || 0).toLocaleString('en-KE')}`;
const newId = () => crypto.randomUUID();
const compactEmail = (value?: string) => {
  if (!value) return '—';
  const trimmed = value.trim();
  if (trimmed.length <= 18) return trimmed;
  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex > 0) {
    const local = trimmed.slice(0, atIndex);
    const domain = trimmed.slice(atIndex + 1);
    return `${local.slice(0, 8)}…@${domain}`;
  }
  return `${trimmed.slice(0, 12)}…`;
};

export default function Management({ view, profile, search, onNavigate }: {
  view: AdminView; profile: AdminProfile; search: string; onNavigate: (view: AdminView) => void;
}) {
  switch (view) {
    case 'members': return <MembersPage key="members" search={search} />;
    case 'applications': return <MembersPage key="applications" search={search} applicationsOnly />;
    case 'payments': return <PaymentsPage search={search} />;
    case 'projects': return <ProjectsPage search={search} />;
    case 'executives':
    case 'leadership': return <LeadershipPage search={search} />;
    case 'events': return <EventsPage search={search} />;
    case 'products': return <ProductsPage search={search} />;
    case 'orders': return <OrdersPage search={search} />;
    case 'messages': return <MessagesPage search={search} />;
    case 'notifications': return <NotificationsPage />;
    case 'reports':
    case 'content':
    case 'settings':
    case 'roles': return <AdminTools view={view} profile={profile} search={search} onNavigate={onNavigate} />;
    default: return null;
  }
}

function PageHeader({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <div className="page-heading">
      <div><p className="eyebrow">IEC JKUAT ADMIN</p><h1>{title}</h1><p>{description}</p></div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  );
}

function Toolbar({ children }: { children: ReactNode }) {
  return <div className="table-toolbar">{children}</div>;
}

function DataViewToggle({ value, onChange }: { value: 'list' | 'grid'; onChange: (value: 'list' | 'grid') => void }) {
  return (
    <div className="data-view-toggle" aria-label="Choose record layout">
      <button type="button" className={value === 'list' ? 'is-active' : ''} onClick={() => onChange('list')}>List</button>
      <button type="button" className={value === 'grid' ? 'is-active' : ''} onClick={() => onChange('grid')}>Grid</button>
    </div>
  );
}

function ErrorState({ error, retry }: { error: string; retry: () => void }) {
  return <div className="load-error"><Notice>{error}</Notice><button className="button-secondary" type="button" onClick={retry}>Retry</button></div>;
}

function LoadState({ loading, error, empty, retry, emptyTitle, emptyDescription, emptyIcon }: {
  loading: boolean;
  error: string;
  empty: boolean;
  retry: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: typeof FiInbox;
}) {
  if (loading) return <p className="table-empty">Loading records…</p>;
  if (error) return <ErrorState error={error} retry={retry} />;
  if (empty) return (
    <EmptyState
      title={emptyTitle ?? 'Nothing here yet'}
      description={emptyDescription ?? 'New records will appear here when they are added.'}
      icon={emptyIcon}
    />
  );
  return null;
}

function ActionButton({ label, onClick, danger = false, children }: {
  label: string; onClick: () => void; danger?: boolean; children: ReactNode;
}) {
  return <button className={`icon-button${danger ? ' is-danger' : ''}`} type="button" aria-label={label} title={label} onClick={onClick}>{children}</button>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-heading"><div><p className="eyebrow">IEC JKUAT</p><h2 id="modal-title">{title}</h2></div><ActionButton label="Close" onClick={onClose}><FiX /></ActionButton></div>
        {children}
      </section>
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text', required = false, placeholder, min, max }: {
  label: string; value: string | number; onChange: (value: string) => void; type?: string;
  required?: boolean; placeholder?: string; min?: string; max?: string;
}) {
  return <label className="form-field"><span>{label}{required && <i> *</i>}</span><input type={type} required={required} value={value} placeholder={placeholder} min={min} max={max} onChange={(event) => onChange(event.target.value)} /></label>;
}

function FormSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (value: string) => void; options: string[];
}) {
  const [open, setOpen] = useState(false);
  const currentValue = options.includes(value) ? value : options[0] ?? '';

  return (
    <div className="form-field custom-select-field">
      <span>{label}</span>
      <div className="custom-select">
        <button type="button" className="custom-select-trigger" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
          <span>{currentValue}</span>
          <FiChevronDown aria-hidden="true" />
        </button>
        {open && (
          <div className="custom-select-menu" role="listbox" aria-label={label}>
            {options.map((option) => (
              <button
                key={option}
                type="button"
                className={`custom-select-option${option === currentValue ? ' is-selected' : ''}`}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FormArea({ label, value, onChange, rows = 4, maxLength, required = false }: {
  label: string; value: string; onChange: (value: string) => void; rows?: number; maxLength?: number; required?: boolean;
}) {
  return <label className="form-field"><span>{label}</span><textarea rows={rows} value={value} maxLength={maxLength} required={required} onChange={(event) => onChange(event.target.value)} /></label>;
}

function ModalActions({ busy, onClose, label = 'Save changes' }: { busy: boolean; onClose: () => void; label?: string }) {
  return <div className="modal-actions"><button className="button-secondary" type="button" onClick={onClose} disabled={busy}>Cancel</button><button className="button-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : label}</button></div>;
}

function NotificationsPage() {
  const [items] = useState([
    { id: '1', title: 'Membership report ready', channel: 'Dashboard', audience: 'Treasurer', unread: true, created_at: '2025-11-17T09:00:00Z' },
    { id: '2', title: 'New application received', channel: 'Email + in-app', audience: 'Membership team', unread: true, created_at: '2025-11-17T08:15:00Z' },
    { id: '3', title: 'Project deadline reminder', channel: 'Push alert', audience: 'VC Projects', unread: false, created_at: '2025-11-16T17:40:00Z' },
  ]);

  return (
    <div className="page-stack">
      <PageHeader title="Notifications" description="Review all in-app and system alerts for executive operations and club updates." />
      <section className="panel data-panel">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Channel</th>
                <th>Audience</th>
                <th>Sent</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.title}</strong></td>
                  <td>{item.channel}</td>
                  <td>{item.audience}</td>
                  <td>{dateLabel(item.created_at)}</td>
                  <td><StatusPill value={item.unread ? 'unread' : 'read'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MembersPage({ search, applicationsOnly = false }: { search: string; applicationsOnly?: boolean }) {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState(applicationsOnly ? 'registered' : 'all');
  const [layout, setLayout] = useState<'list' | 'grid'>('list');
  const [result, setResult] = useState<PaginatedMembers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Member | null>(null);
  const [busyId, setBusyId] = useState('');
  const normalizedSearch = search.trim();

  useEffect(() => { setPage(0); }, [normalizedSearch]);

  async function load() {
    setLoading(true);
    setError('');
    try { setResult(await adminApi.members(page, normalizedSearch, status)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load members.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [page, status, normalizedSearch]);

  async function activate(member: Member) {
    setBusyId(member.id);
    try {
      const updated = await adminApi.updateMember(member.id, { membership_status: 'active' });
      setResult((current) => {
        if (!current) return current;
        if (applicationsOnly) {
          return {
            ...current,
            items: current.items.filter((row) => row.id !== member.id),
            total: Math.max(0, current.total - 1),
          };
        }
        return { ...current, items: current.items.map((row) => row.id === member.id ? { ...row, ...updated } : row) };
      });
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not activate this member.'); }
    finally { setBusyId(''); }
  }

  async function remove(member: Member) {
    if (!window.confirm(`Remove ${member.full_name} from the member register? This cannot be undone.`)) return;
    setBusyId(member.id);
    try {
      await adminApi.deleteMember(member.id);
      setResult((current) => current && ({ ...current, items: current.items.filter((row) => row.id !== member.id), total: Math.max(0, current.total - 1) }));
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not remove this member.'); }
    finally { setBusyId(''); }
  }

  function exportCsv() {
    if (!result) return;
    const header = ['Name', 'Registration number', 'College', 'Course', 'Year', 'Phone', 'Email', 'Status', 'Joined'];
    const rows = result.items.map((member) => [
      member.full_name, member.reg_number, member.college, member.course, member.year_of_study,
      member.phone, member.email, member.membership_status, member.created_at ?? '',
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => {
      let value = String(cell ?? '');
      if (/^\s*[=+\-@]/.test(value)) value = `'${value}`;
      return `"${value.replace(/"/g, '""')}"`;
    }).join(',')).join('\r\n');
    const link = document.createElement('a');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.href = url;
    link.download = `iec-members-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportPdf() {
    if (!result?.items.length) return;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const now = new Date();

    doc.setFillColor(247, 244, 255);
    doc.rect(0, 0, pageWidth, 94, 'F');
    doc.setTextColor(49, 38, 85);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('IEC JKUAT MEMBERS REGISTER', 40, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(89, 90, 106);
    doc.text(`Generated ${now.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}`, 40, 62);
    doc.setTextColor(88, 80, 183);
    doc.text(`${result.total} records`, pageWidth - 120, 62);

    const rows = result.items.map((member) => [
      member.full_name,
      member.reg_number,
      member.college,
      member.course,
      String(member.year_of_study),
      member.phone,
      member.email,
      member.membership_status,
      new Date(member.created_at ?? Date.now()).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }),
    ]);

    autoTable(doc, {
      startY: 108,
      head: [['Name', 'Reg. No.', 'College', 'Course', 'Year', 'Phone', 'Email', 'Status', 'Joined']],
      body: rows,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 6,
        valign: 'middle',
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [105, 89, 210],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [248, 247, 255] },
      margin: { left: 32, right: 32 },
      columnStyles: {
        0: { cellWidth: 88 },
        1: { cellWidth: 58 },
        2: { cellWidth: 72 },
        3: { cellWidth: 92 },
        4: { cellWidth: 30 },
        5: { cellWidth: 60 },
        6: { cellWidth: 104 },
        7: { cellWidth: 52 },
        8: { cellWidth: 58 },
      },
      didDrawPage: () => {
        doc.setFontSize(8);
        doc.setTextColor(120, 122, 139);
        doc.text('IEC JKUAT • Administrative records', 32, pageHeight - 20);
        doc.text(String(doc.getCurrentPageInfo().pageNumber), pageWidth - 38, pageHeight - 20);
      },
    });

    doc.save(`iec-members-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <div className="page-stack">
      <PageHeader
        title={applicationsOnly ? 'Membership applications' : 'Members'}
        description={applicationsOnly
          ? 'Review registered applicants. Approval is available only after a completed payment is confirmed.'
          : 'Review registrations, keep member details up to date, and export the register.'}
      >
        <button className="button-secondary" type="button" onClick={exportCsv} disabled={!result?.items.length}><FiArrowDown /> Export CSV</button>
        <button className="button-primary" type="button" onClick={exportPdf} disabled={!result?.items.length}><FiArrowDown /> Export PDF</button>
      </PageHeader>
      <div className="metric-grid mini-metrics">
        <MetricTile label={applicationsOnly ? 'Registered applications' : 'Members in directory'} value={result?.total.toLocaleString() ?? '—'} icon="01" />
        <MetricTile label="Current page" value={result?.items.length.toLocaleString() ?? '—'} icon="02" />
        <MetricTile label={applicationsOnly ? 'Payment confirmed on page' : 'Active on this page'} value={result?.items.filter((member) => applicationsOnly ? member.has_completed_payment : member.membership_status === 'active').length.toLocaleString() ?? '—'} icon="03" />
      </div>
      <section className="panel data-panel">
        <Toolbar>
          <div className="toolbar-note"><strong>{result?.total.toLocaleString() ?? '—'} members</strong><span>Search using the bar above.</span></div>
          {applicationsOnly
            ? <div className="toolbar-note"><strong>Registered only</strong><span>Activation requires confirmed payment.</span></div>
            : <FormSelect label="Membership" value={status} onChange={(value) => { setStatus(value); setPage(0); }} options={['all', 'active', 'registered']} />}
          <DataViewToggle value={layout} onChange={setLayout} />
        </Toolbar>
        <LoadState
          loading={loading}
          error={error}
          empty={!result?.items.length}
          retry={() => void load()}
          emptyTitle={applicationsOnly ? 'No applications yet' : 'No members yet'}
          emptyDescription="Website registrations will appear here automatically."
          emptyIcon={applicationsOnly ? FiUserPlus : FiUsers}
        />
        {!loading && !error && result && result.items.length > 0 && (
          <>
            {layout === 'list' ? (
              <div className="table-scroll"><table className="data-table">
                <thead><tr><th>Member</th><th>College / course</th><th>Year</th><th>Joined</th><th>Payment</th><th>Membership</th><th>Actions</th></tr></thead>
                <tbody>{result.items.map((member) => (
                  <tr key={member.id}>
                    <td><div className="table-person"><span className="avatar-soft">{member.full_name.slice(0, 1).toUpperCase()}</span><span><strong>{member.full_name}</strong><small>{member.reg_number} · {compactEmail(member.email)}</small></span></div></td>
                    <td>{member.college}<small className="cell-subtext">{member.course}</small></td>
                    <td>Year {member.year_of_study}</td>
                    <td>{dateLabel(member.created_at)}</td>
                    <td><StatusPill value={member.latest_payment?.status || 'no payment'} /></td>
                    <td><StatusPill value={member.membership_status} /></td>
                    <td><div className="row-actions">
                      <ActionButton label="Edit member" onClick={() => setEditing(member)}><FiEdit2 /></ActionButton>
                      {member.membership_status !== 'active' && member.has_completed_payment && (
                        <button className="button-approve" type="button" disabled={busyId === member.id} onClick={() => void activate(member)}><FiCheck /> Approve</button>
                      )}
                      <ActionButton label="Remove member" danger onClick={() => void remove(member)}><FiTrash2 /></ActionButton>
                    </div></td>
                  </tr>
                ))}</tbody>
              </table></div>
            ) : (
              <div className="resource-grid">
                {result.items.map((member) => (
                  <article className="resource-card" key={member.id}>
                    <div className="resource-card-head">
                      <span className="avatar-soft">{member.full_name.slice(0, 1).toUpperCase()}</span>
                      <div>
                        <strong>{member.full_name}</strong>
                        <small>{member.reg_number}</small>
                      </div>
                    </div>
                    <div className="resource-meta">
                      <span>{member.college}</span>
                      <span>{member.course}</span>
                    </div>
                    <dl className="resource-details">
                      <div><dt>Email</dt><dd>{compactEmail(member.email)}</dd></div>
                      <div><dt>Year</dt><dd>Year {member.year_of_study}</dd></div>
                      <div><dt>Joined</dt><dd>{dateLabel(member.created_at)}</dd></div>
                    </dl>
                    <div className="resource-card-foot">
                      <StatusPill value={member.membership_status} />
                      <div className="row-actions">
                        <ActionButton label="Edit member" onClick={() => setEditing(member)}><FiEdit2 /></ActionButton>
                        <ActionButton label="Remove member" danger onClick={() => void remove(member)}><FiTrash2 /></ActionButton>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <div className="pagination"><span>Showing {page * result.pageSize + 1}–{page * result.pageSize + result.items.length} of {result.total}</span><div><button type="button" className="button-secondary" disabled={page === 0 || loading} onClick={() => setPage((value) => value - 1)}><FiArrowDown className="rotate-90" /> Previous</button><button type="button" className="button-secondary" disabled={(page + 1) * result.pageSize >= result.total || loading} onClick={() => setPage((value) => value + 1)}>Next <FiArrowUp className="rotate-90" /></button></div></div>
          </>
        )}
      </section>
      {editing && <MemberEditor member={editing} onClose={() => setEditing(null)} onSaved={(saved) => {
        setResult((current) => current && ({ ...current, items: current.items.map((member) => member.id === saved.id ? { ...member, ...saved } : member) }));
        setEditing(null);
      }} />}
    </div>
  );
}

function MemberEditor({ member, onClose, onSaved }: { member: Member; onClose: () => void; onSaved: (member: Member) => void }) {
  const [draft, setDraft] = useState({ full_name: member.full_name, college: member.college, course: member.course, year_of_study: String(member.year_of_study), phone: member.phone, email: member.email });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key: keyof typeof draft) => (value: string) => setDraft((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { onSaved(await adminApi.updateMember(member.id, { ...draft, year_of_study: Number(draft.year_of_study) })); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save member details.'); setBusy(false); }
  }
  return <Modal title="Edit member" onClose={onClose}><form className="modal-form" onSubmit={submit}>
    {error && <Notice>{error}</Notice>}
    <div className="form-grid">
      <FormField label="Full name" value={draft.full_name} onChange={set('full_name')} required />
      <FormField label="Email" type="email" value={draft.email} onChange={set('email')} required />
      <FormField label="College" value={draft.college} onChange={set('college')} required />
      <FormField label="Course" value={draft.course} onChange={set('course')} required />
      <FormField label="Year of study" type="number" min="1" max="6" value={draft.year_of_study} onChange={set('year_of_study')} required />
      <FormField label="Phone" value={draft.phone} onChange={set('phone')} required />
    </div>
    <ModalActions busy={busy} onClose={onClose} />
  </form></Modal>;
}

function PaymentsPage({ search }: { search: string }) {
  const [items, setItems] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('all');
  async function load() {
    setLoading(true); setError('');
    try { setItems(await adminApi.payments()); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load payment records.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const list = useMemo(() => items.filter((payment) => {
    const matchesStatus = status === 'all' || payment.payment_status === status;
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [payment.members?.full_name, payment.members?.reg_number, payment.phone, payment.lipana_ref].some((value) => value?.toLowerCase().includes(term));
    return matchesStatus && matchesSearch;
  }), [items, search, status]);
  const complete = items.filter((payment) => payment.payment_status === 'completed');
  const collected = complete.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  return <div className="page-stack">
    <PageHeader title="Payments" description="Monitor M-Pesa attempts and confirmed membership payments." />
    <div className="metric-grid mini-metrics"><MetricTile label="Collected" value={money(collected)} icon="KES" /><MetricTile label="Confirmed" value={String(complete.length)} icon="✓" /><MetricTile label="Pending" value={String(items.filter((payment) => payment.payment_status === 'pending').length)} icon="…" /><MetricTile label="Unsuccessful" value={String(items.filter((payment) => !['pending', 'completed'].includes(payment.payment_status)).length)} icon="!" /></div>
    <section className="panel data-panel">
      <Toolbar><div className="toolbar-note"><strong>{list.length} records</strong><span>Successful payments are confirmed by the M-Pesa webhook.</span></div><FormSelect label="Payment status" value={status} onChange={setStatus} options={['all', 'pending', 'completed', 'failed', 'cancelled']} /></Toolbar>
      <LoadState loading={loading} error={error} empty={!list.length} retry={() => void load()} emptyTitle="No payment records yet" emptyDescription="Member payment activity will appear here as transactions are recorded." emptyIcon={FiCreditCard} />
      {!loading && !error && list.length > 0 && <div className="table-scroll"><table className="data-table">
        <thead><tr><th>Member</th><th>Phone</th><th>Amount</th><th>Reference</th><th>Date</th><th>Status</th></tr></thead>
        <tbody>{list.map((payment) => <tr key={payment.id}>
          <td><strong>{payment.members?.full_name || 'Member unavailable'}</strong><small className="cell-subtext">{payment.members?.reg_number || '—'}</small></td>
          <td>{payment.phone}</td><td className="money-cell">{money(payment.amount)}</td>
          <td className="reference-cell">{payment.lipana_ref || '—'}</td><td>{dateLabel(payment.created_at)}</td><td><StatusPill value={payment.payment_status} /></td>
        </tr>)}</tbody>
      </table></div>}
      <p className="panel-footnote">Pending requests cannot be manually approved here; payment completion is verified by the provider callback and activates membership automatically.</p>
    </section>
  </div>;
}

function OrdersPage({ search }: { search: string }) {
  const [orders, setOrders] = useState<MerchOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try { setOrders(await adminApi.merchOrders()); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load merchandise orders.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const normalizedSearch = search.trim().toLowerCase();
  const list = useMemo(() => orders.filter((order) => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const items = (order.items ?? []).map((item) => `${item.product_name} ${item.size ?? ''}`).join(' ');
    const matchesSearch = !normalizedSearch
      || [order.id, order.customer_name, order.customer_phone, items].some((value) => value.toLowerCase().includes(normalizedSearch));
    return matchesStatus && matchesSearch;
  }), [orders, normalizedSearch, statusFilter]);

  async function updateStatus(order: MerchOrder, status: MerchOrderStatus) {
    if (status === order.status) return;
    setUpdatingId(order.id);
    setError('');
    try {
      const updated = await adminApi.updateMerchOrderStatus(order.id, status);
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, ...updated } : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update this order.');
    } finally {
      setUpdatingId('');
    }
  }

  const pending = orders.filter((order) => order.status === 'pending').length;
  const confirmed = orders.filter((order) => order.status === 'confirmed').length;
  const fulfilled = orders.filter((order) => order.status === 'fulfilled').length;

  return <div className="page-stack">
    <PageHeader title="Merchandise Orders" description="Review customer details and items, then track each order through fulfilment.">
      <button className="button-secondary" type="button" onClick={() => void load()} disabled={loading}>Refresh orders</button>
    </PageHeader>
    <div className="metric-grid mini-metrics">
      <MetricTile label="All orders" value={String(orders.length)} icon="ORD" />
      <MetricTile label="Pending" value={String(pending)} icon="…" />
      <MetricTile label="Confirmed" value={String(confirmed)} icon="✓" />
      <MetricTile label="Fulfilled" value={String(fulfilled)} icon="✓" />
    </div>
    <section className="panel data-panel">
      <Toolbar>
        <div className="toolbar-note"><strong>{list.length} orders</strong><span>Orders submitted from the public store</span></div>
        <FormSelect label="Order status" value={statusFilter} onChange={setStatusFilter} options={['all', 'pending', 'confirmed', 'fulfilled', 'cancelled']} />
      </Toolbar>
      {error && <Notice>{error}</Notice>}
      <LoadState loading={loading} error="" empty={!error && !list.length} retry={() => void load()} emptyTitle="No orders yet" emptyDescription="New customer orders will appear here after checkout." emptyIcon={FiPackage} />
      {!loading && !error && list.length > 0 && (
        <div className="table-scroll">
          <table className="data-table orders-table">
            <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Submitted</th></tr></thead>
            <tbody>{list.map((order) => (
              <tr key={order.id}>
                <td><strong>IEC-{order.id.slice(0, 8).toUpperCase()}</strong><small className="cell-subtext">{order.id}</small></td>
                <td><strong>{order.customer_name}</strong><small className="cell-subtext"><a href={`tel:${order.customer_phone}`}>{order.customer_phone}</a></small></td>
                <td><div className="order-line-items">{(order.items ?? []).map((item) => (
                  <p key={item.id}><strong>{item.quantity}× {item.product_name}</strong>{item.size && <span>Size {item.size}</span>}{item.color && <span>Color {item.color}</span>}<small>{money(item.unit_price)} each</small></p>
                ))}</div></td>
                <td className="money-cell">{money(order.total_amount)}</td>
                <td>
                  <select
                    className="order-status-select"
                    aria-label={`Update status for order IEC-${order.id.slice(0, 8).toUpperCase()}`}
                    value={order.status}
                    disabled={updatingId === order.id}
                    onChange={(event) => void updateStatus(order, event.target.value as MerchOrderStatus)}
                  >
                    {(['pending', 'confirmed', 'fulfilled', 'cancelled'] as const).map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </td>
                <td>{dateLabel(order.created_at)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  </div>;
}

function ProjectsPage({ search }: { search: string }) {
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Project | null | undefined>(undefined);
  async function load() { setLoading(true); setError(''); try { setItems(await adminApi.projects()); } catch (err) { setError(err instanceof Error ? err.message : 'Could not load projects.'); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  const list = items.filter((item) => `${item.name} ${item.team_lead} ${item.category ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  async function remove(project: Project) {
    if (!window.confirm(`Delete "${project.name}"?`)) return;
    try { await adminApi.deleteProject(project.id); setItems((current) => current.filter((item) => item.id !== project.id)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not delete the project.'); }
  }
  const [layout, setLayout] = useState<'list' | 'grid'>('grid');
  return <div className="page-stack">
    <PageHeader title="Projects" description="Create project stories and choose which ones appear on the public website."><button className="button-primary" type="button" onClick={() => setEditing(null)}><FiPlus /> Add project</button></PageHeader>
    <section className="panel data-panel">
      <Toolbar>
        <div className="toolbar-note"><strong>{list.length} projects</strong><span>Public-facing project stories</span></div>
        <DataViewToggle value={layout} onChange={setLayout} />
      </Toolbar>
      <LoadState loading={loading} error={error} empty={!list.length} retry={() => void load()} emptyTitle="No projects yet" emptyDescription="Add a project to start building the public showcase." emptyIcon={FiBriefcase} />
      {!loading && !error && list.length > 0 && (
        layout === 'list' ? (
          <div className="table-scroll"><table className="data-table"><thead><tr><th>Project</th><th>Lead</th><th>Progress</th><th>Category</th><th>Visibility</th><th>Actions</th></tr></thead><tbody>{list.map((project) => <tr key={project.id}><td><strong>{project.name}</strong><small className="cell-subtext">{project.description || 'No project description yet.'}</small></td><td>{project.team_lead || '—'}</td><td>{project.progress}%</td><td>{project.category || 'Project'}</td><td><StatusPill value={project.is_published ? 'published' : 'draft'} /></td><td><div className="row-actions"><ActionButton label="Edit project" onClick={() => setEditing(project)}><FiEdit2 /></ActionButton><ActionButton label="Delete project" danger onClick={() => void remove(project)}><FiTrash2 /></ActionButton></div></td></tr>)}</tbody></table></div>
        ) : (
          <div className="resource-grid">{list.map((project) => {
            const image = mediaUrls(project.media_urls)[0];
            return <article className="resource-card project-card" key={project.id}>
              {image ? <img className="project-cover" src={image} alt="" /> : <div className="project-cover project-cover-empty"><FiPlus /></div>}
              <div className="project-card-body"><div className="project-card-top"><StatusPill value={project.is_published ? 'published' : 'draft'} /><span>{project.category || 'Project'}</span></div><h2>{project.name}</h2><p>{project.description || 'No project description yet.'}</p><div className="project-progress"><span style={{ width: `${project.progress}%` }} /></div><div className="project-card-foot"><span>{project.team_lead} · {project.progress}%</span><div className="row-actions"><ActionButton label="Edit project" onClick={() => setEditing(project)}><FiEdit2 /></ActionButton>{image && <a className="icon-button" href={image} target="_blank" rel="noreferrer" aria-label="Open project image"><FiExternalLink /></a>}<ActionButton label="Delete project" danger onClick={() => void remove(project)}><FiTrash2 /></ActionButton></div></div></div>
            </article>;
          })}</div>
        )
      )}
    </section>
    {editing !== undefined && <ProjectEditor project={editing} onClose={() => setEditing(undefined)} onSaved={(saved) => { setItems((current) => [saved, ...current.filter((item) => item.id !== saved.id)]); setEditing(undefined); }} />}
  </div>;
}

function ProjectEditor({ project, onClose, onSaved }: { project: Project | null; onClose: () => void; onSaved: (project: Project) => void }) {
  const [id] = useState(project?.id ?? newId());
  const [draft, setDraft] = useState({
    name: project?.name ?? '', team_lead: project?.team_lead ?? '', status: project?.status ?? 'Ideation',
    progress: String(project?.progress ?? 0), category: project?.category ?? '',
    description: project?.description ?? '', is_published: project?.is_published ?? false,
  });
  const [media, setMedia] = useState(mediaUrls(project?.media_urls));
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key: keyof typeof draft) => (value: string) => setDraft((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const ticket = await adminApi.createUpload('project', id, file);
        await uploadImage(ticket, file);
        uploaded.push(ticket.publicUrl);
      }
      const saved = await adminApi.saveProject({
        id, name: draft.name.trim(), team_lead: draft.team_lead.trim(), status: draft.status,
        progress: Number(draft.progress), category: draft.category || null, description: draft.description || null,
        media_urls: [...media, ...uploaded], is_published: draft.is_published,
      });
      onSaved(saved);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save this project.'); setBusy(false); }
  }
  return <Modal title={project ? 'Edit project' : 'New project'} onClose={onClose}><form className="modal-form" onSubmit={submit}>
    {error && <Notice>{error}</Notice>}
    <div className="form-grid"><FormField label="Project name" value={draft.name} onChange={set('name')} required /><FormField label="Team lead" value={draft.team_lead} onChange={set('team_lead')} required /><FormSelect label="Stage" value={draft.status} onChange={set('status')} options={['Ideation', 'Incubating', 'MVP Live']} /><FormField label="Category" value={draft.category} onChange={set('category')} placeholder="e.g. AgTech" /><FormField label="Progress %" type="number" min="0" max="100" value={draft.progress} onChange={set('progress')} required /></div>
    <FormArea label="Description" value={draft.description} onChange={set('description')} />
    <FilePicker label="Project images" files={files} onChange={setFiles} existing={media} onRemoveExisting={(url) => setMedia((current) => current.filter((item) => item !== url))} />
    <label className="checkbox-field"><input type="checkbox" checked={draft.is_published} onChange={(event) => setDraft((current) => ({ ...current, is_published: event.target.checked }))} /><span>Publish on the public website</span></label>
    <ModalActions busy={busy} onClose={onClose} label={project ? 'Save project' : 'Create project'} />
  </form></Modal>;
}

function LeadershipPage({ search }: { search: string }) {
  const [items, setItems] = useState<Executive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Executive | null | undefined>(undefined);
  async function load() { setLoading(true); setError(''); try { setItems(await adminApi.executives()); } catch (err) { setError(err instanceof Error ? err.message : 'Could not load leadership profiles.'); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  const list = items.filter((member) => `${member.name} ${member.role}`.toLowerCase().includes(search.trim().toLowerCase()));
  async function remove(member: Executive) {
    if (!window.confirm(`Remove ${member.name || member.role} from the leadership list?`)) return;
    try { await adminApi.deleteExecutive(member.id); setItems((current) => current.filter((item) => item.id !== member.id)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not remove this profile.'); }
  }
  return <div className="page-stack">
    <PageHeader title="Leadership" description="Maintain the executive directory and publish profile photos to the website."><button className="button-primary" type="button" onClick={() => setEditing(null)}><FiPlus /> Add profile</button></PageHeader>
    <LoadState loading={loading} error={error} empty={!list.length} retry={() => void load()} emptyTitle="No leadership profiles yet" emptyDescription="Add an executive profile to introduce your team." emptyIcon={FiUsers} />
    {!loading && !error && list.length > 0 && <div className="leadership-grid">{list.map((member) => (
      <article className="leader-card" key={member.id}>
        <div className="leader-photo">
          <div className="leader-avatar">
            <ExecutivePortrait name={member.name || member.role} photoPath={member.photo_path} />
          </div>
          <StatusPill value={member.is_active ? 'active' : 'hidden'} />
        </div>
        <div className="leader-info">
          <p className="leader-role">{member.role}</p>
          <h2>{member.name || 'Profile setup'}</h2>
          <p className="leader-description">{member.description || 'Add a short introduction to publish this profile.'}</p>
          <details className="leader-responsibilities">
            <summary>
              <strong>What they do</strong>
              <span>{member.responsibilities || 'Add this role’s key responsibilities.'}</span>
            </summary>
            <p>{member.responsibilities || 'Add this role’s key responsibilities.'}</p>
          </details>
          <div className="leader-card-footer">
            <span>{member.level}</span>
            <div className="leader-actions"><ActionButton label="Edit profile" onClick={() => setEditing(member)}><FiEdit2 /></ActionButton><ActionButton label="Delete profile" danger onClick={() => void remove(member)}><FiTrash2 /></ActionButton></div>
          </div>
        </div>
      </article>
    ))}</div>}
    {editing !== undefined && <ExecutiveEditor executive={editing} onClose={() => setEditing(undefined)} onSaved={(saved) => { setItems((current) => [saved, ...current.filter((item) => item.id !== saved.id)]); setEditing(undefined); }} />}
  </div>;
}

function ExecutiveEditor({ executive, onClose, onSaved }: { executive: Executive | null; onClose: () => void; onSaved: (executive: Executive) => void }) {
  const [id] = useState(executive?.id ?? newId());
  const [name, setName] = useState(executive?.name ?? '');
  const [role, setRole] = useState(executive?.role ?? 'Vice Chairperson Membership');
  const [description, setDescription] = useState(executive?.description ?? '');
  const [responsibilities, setResponsibilities] = useState(executive?.responsibilities ?? '');
  const [level, setLevel] = useState<Executive['level']>(executive?.level ?? 'lead');
  const [order, setOrder] = useState(String(executive?.display_order ?? 0));
  const [active, setActive] = useState(executive?.is_active ?? true);
  const [photo] = useState(executive?.photo_path ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!file) {
      setFilePreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setFilePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [file]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      let photoPath = photo;
      if (file) {
        const ticket = await adminApi.createUpload('executive', id, file);
        await uploadImage(ticket, file);
        photoPath = ticket.path;
      }
      const saved = await adminApi.saveExecutive({
        id,
        name: name.trim(),
        role: role.trim(),
        description: description.trim(),
        responsibilities: responsibilities.trim(),
        level,
        display_order: Number(order),
        is_active: active,
        photo_path: photoPath || null,
      });
      onSaved(saved);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save this profile.'); setBusy(false); }
  }
  const executiveRoles = [
    'Chairperson',
    'Vice Chairperson Membership',
    'Vice Chairperson Projects',
    'Vice Chairperson Education',
    'Deputy Vice Chairperson Projects',
    'Secretary General',
    'Treasurer',
    'PR & Communications',
  ];
  const roleOptions = role && !executiveRoles.includes(role) ? [role, ...executiveRoles] : executiveRoles;

  return <Modal title={executive ? 'Edit leadership profile' : 'Add leadership profile'} onClose={onClose}><form className="modal-form" onSubmit={submit}>
    {error && <Notice>{error}</Notice>}
    <div className="form-grid">
      <FormField label="Full name" value={name} onChange={setName} required />
      <FormSelect label="Executive role" value={role || roleOptions[0]} onChange={setRole} options={roleOptions} />
      <FormSelect label="Group" value={level} onChange={(value) => setLevel(value as Executive['level'])} options={['advisor', 'executive', 'lead']} />
      <FormField label="Display order" type="number" min="0" max="999" value={order} onChange={setOrder} />
    </div>
    <FormArea label="Short introduction" value={description} onChange={setDescription} rows={3} maxLength={500} required />
    <FormArea label="What they do" value={responsibilities} onChange={setResponsibilities} rows={3} maxLength={1000} required />
    <label className="form-field"><span>Portrait (JPG, PNG or WebP · max 5 MB)</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
      const selectedFile = event.target.files?.[0] ?? null;
      setError('');
      if (selectedFile && (!['image/jpeg', 'image/png', 'image/webp'].includes(selectedFile.type) || selectedFile.size > 5 * 1024 * 1024)) {
        setError('Choose a JPG, PNG or WebP image smaller than 5 MB.');
        setFile(null);
        event.target.value = '';
        return;
      }
      setFile(selectedFile);
    }} /></label>
    <div className="executive-image-preview">
      <ExecutivePortrait name={name || role} photoPath={photo} previewUrl={filePreview} />
    </div>
    {file && <small className="upload-file-name">{file.name}</small>}
    <label className="checkbox-field"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /><span>Show this profile on the public website</span></label>
    <ModalActions busy={busy} onClose={onClose} label="Save profile" />
  </form></Modal>;
}

function ExecutivePortrait({ name, photoPath, previewUrl }: {
  name: string;
  photoPath: string | null;
  previewUrl?: string | null;
}) {
  const uploadedPhoto = previewUrl || publicImageUrl(photoPath);
  const [src, setSrc] = useState<string | null>(uploadedPhoto);

  useEffect(() => {
    setSrc(uploadedPhoto);
  }, [uploadedPhoto]);

  return src
    ? <img src={src} alt={`${name} portrait`} onError={() => setSrc(null)} />
    : <span aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>;
}

function EventsPage({ search }: { search: string }) {
  const [items, setItems] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<EventRecord | null | undefined>(undefined);
  const [detailsEvent, setDetailsEvent] = useState<EventRecord | null>(null);
  async function load() { setLoading(true); setError(''); try { setItems(await adminApi.events()); } catch (err) { setError(err instanceof Error ? err.message : 'Could not load events.'); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  const list = items.filter((event) => `${event.title} ${event.location ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  async function remove(event: EventRecord) {
    if (!window.confirm(`Delete "${event.title}"?`)) return;
    try { await adminApi.deleteEvent(event.id); setItems((current) => current.filter((item) => item.id !== event.id)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not delete event.'); }
  }
  const [layout, setLayout] = useState<'list' | 'grid'>('grid');
  return <div className="page-stack"><PageHeader title="Events" description="Publish upcoming activities to the public events calendar."><button className="button-primary" type="button" onClick={() => setEditing(null)}><FiPlus /> Add event</button></PageHeader><section className="panel data-panel">
    <Toolbar>
      <div className="toolbar-note"><strong>{list.length} events</strong><span>Planned activities</span></div>
      <DataViewToggle value={layout} onChange={setLayout} />
    </Toolbar>
    <LoadState loading={loading} error={error} empty={!list.length} retry={() => void load()} emptyTitle="No events yet" emptyDescription="Add an event to share it on the public website." emptyIcon={FiCalendar} />
    {!loading && !error && list.length > 0 && (
      layout === 'list' ? (
        <div className="table-scroll"><table className="data-table"><thead><tr><th>Event</th><th>Date</th><th>Category</th><th>Location</th><th>Actions</th></tr></thead><tbody>{list.map((event) => <tr key={event.id}><td><strong>{event.title}</strong><small className="cell-subtext">{event.description || 'No description'}</small></td><td>{dateLabel(event.event_date)}</td><td>{event.category || '—'}</td><td>{event.location || '—'}</td><td><div className="row-actions"><button className="button-secondary details-button" type="button" onClick={() => setDetailsEvent(event)}><FiInfo /> Details</button><ActionButton label="Edit event" onClick={() => setEditing(event)}><FiEdit2 /></ActionButton><ActionButton label="Delete event" danger onClick={() => void remove(event)}><FiTrash2 /></ActionButton></div></td></tr>)}</tbody></table></div>
      ) : (
        <div className="resource-grid">{list.map((event) => <article className="resource-card" key={event.id}><div className="resource-card-head"><span className="avatar-soft">{event.title.slice(0, 1).toUpperCase()}</span><div><strong>{event.title}</strong><small>{event.category || 'Event'}</small></div></div><div className="resource-meta"><span>{dateLabel(event.event_date)}</span><span>{event.location || 'TBA'}</span></div><p className="resource-summary">{event.description || 'No description provided yet.'}</p><div className="resource-card-foot"><StatusPill value={event.category || 'event'} /><div className="row-actions"><button className="button-secondary details-button" type="button" onClick={() => setDetailsEvent(event)}><FiInfo /> Details</button><ActionButton label="Edit event" onClick={() => setEditing(event)}><FiEdit2 /></ActionButton><ActionButton label="Delete event" danger onClick={() => void remove(event)}><FiTrash2 /></ActionButton></div></div></article>)}</div>
      )
    )}
  </section>
  {detailsEvent && <EventDetails event={detailsEvent} onClose={() => setDetailsEvent(null)} />}
  {editing !== undefined && <EventEditor event={editing} onClose={() => setEditing(undefined)} onSaved={(saved) => { setItems((current) => [saved, ...current.filter((item) => item.id !== saved.id)]); setEditing(undefined); }} />}
  </div>;
}

function EventDetails({ event, onClose }: { event: EventRecord; onClose: () => void }) {
  const media = stringList(event.media_urls);
  const embeds = stringList(event.embed_urls);

  return (
    <Modal title={event.title} onClose={onClose}>
      <div className="details-content">
        <dl className="details-grid">
          <div><dt>Date</dt><dd>{dateLabel(event.event_date)}</dd></div>
          <div><dt>Category</dt><dd>{event.category || 'Uncategorised'}</dd></div>
          <div><dt>Location</dt><dd>{event.location || 'Not specified'}</dd></div>
          <div><dt>Record created</dt><dd>{dateLabel(event.created_at)}</dd></div>
        </dl>
        <section className="details-section">
          <h3>Event information</h3>
          <p>{event.description || 'No event description has been added.'}</p>
        </section>
        {(media.length > 0 || embeds.length > 0) && (
          <section className="details-section">
            <h3>Related media and links</h3>
            <ul className="details-links">
              {media.map((url, index) => <li key={url}><a href={url} target="_blank" rel="noreferrer">View event image {index + 1}<FiExternalLink /></a></li>)}
              {embeds.map((url) => <li key={url}><a href={url} target="_blank" rel="noreferrer">{url}<FiExternalLink /></a></li>)}
            </ul>
          </section>
        )}
      </div>
    </Modal>
  );
}

function EventEditor({ event, onClose, onSaved }: { event: EventRecord | null; onClose: () => void; onSaved: (event: EventRecord) => void }) {
  const [id] = useState(event?.id ?? newId());
  const [draft, setDraft] = useState({ title: event?.title ?? '', event_date: event?.event_date ?? '', category: event?.category ?? 'Workshop', location: event?.location ?? '', description: event?.description ?? '' });
  const [media, setMedia] = useState(stringList(event?.media_urls));
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const set = (key: keyof typeof draft) => (value: string) => setDraft((current) => ({ ...current, [key]: value }));
  async function submit(formEvent: FormEvent) {
    formEvent.preventDefault(); setBusy(true); setError('');
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const ticket = await adminApi.createUpload('event', id, file);
        await uploadImage(ticket, file);
        uploaded.push(ticket.publicUrl);
      }
      onSaved(await adminApi.saveEvent({
        id, ...draft, category: draft.category || null, location: draft.location || null,
        description: draft.description || null, media_urls: [...media, ...uploaded],
        embed_urls: stringList(event?.embed_urls),
      }));
    }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save event.'); setBusy(false); }
  }
  return <Modal title={event ? 'Edit event' : 'Add event'} onClose={onClose}><form className="modal-form" onSubmit={submit}>{error && <Notice>{error}</Notice>}<div className="form-grid"><FormField label="Event title" value={draft.title} onChange={set('title')} required /><FormField label="Date" type="date" value={draft.event_date} onChange={set('event_date')} required /><FormField label="Category" value={draft.category} onChange={set('category')} /><FormField label="Location" value={draft.location} onChange={set('location')} /></div><FormArea label="Description" value={draft.description} onChange={set('description')} /><FilePicker label="Event images" files={files} onChange={setFiles} existing={media} onRemoveExisting={(url) => setMedia((current) => current.filter((item) => item !== url))} /><ModalActions busy={busy} onClose={onClose} label="Save event" /></form></Modal>;
}

function ProductsPage({ search }: { search: string }) {
  const [items, setItems] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [editing, setEditing] = useState<ProductRecord | null | undefined>(undefined);
  async function load() { setLoading(true); setError(''); try { setItems(await adminApi.products()); } catch (err) { setError(err instanceof Error ? err.message : 'Could not load products.'); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  const list = items.filter((item) => `${item.name} ${item.category}`.toLowerCase().includes(search.trim().toLowerCase()));
  async function remove(product: ProductRecord) { if (!window.confirm(`Delete "${product.name}"?`)) return; try { await adminApi.deleteProduct(product.id); setItems((current) => current.filter((item) => item.id !== product.id)); } catch (err) { setError(err instanceof Error ? err.message : 'Could not delete product.'); } }
  const [layout, setLayout] = useState<'list' | 'grid'>('grid');
  return <div className="page-stack"><PageHeader title="Products" description="Manage merchandise and what appears in the public shop."><button className="button-primary" type="button" onClick={() => setEditing(null)}><FiPlus /> Add product</button></PageHeader><section className="panel data-panel"><Toolbar><div className="toolbar-note"><strong>{list.length} products</strong><span>Showcase inventory</span></div><DataViewToggle value={layout} onChange={setLayout} /></Toolbar><LoadState loading={loading} error={error} empty={!list.length} retry={() => void load()} emptyTitle="No products yet" emptyDescription="Add a product to populate the public shop." emptyIcon={FiShoppingBag} />{!loading && !error && list.length > 0 && (
    layout === 'list' ? (
      <div className="table-scroll"><table className="data-table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Sizes</th><th>Colors</th><th>Visibility</th><th>Actions</th></tr></thead><tbody>{list.map((product) => <tr key={product.id}><td><div className="table-person">{product.image_url ? <img className="product-thumb" src={product.image_url} alt="" /> : <span className="avatar-soft">P</span>}<span><strong>{product.name}</strong><small>{product.description || '—'}</small></span></div></td><td>{product.category}</td><td className="money-cell">{money(product.price)}</td><td>{stringList(product.sizes).join(', ') || '—'}</td><td>{stringList(product.colors).join(', ') || '—'}</td><td><StatusPill value={product.is_member_exclusive ? 'member-only' : 'public'} /></td><td><div className="row-actions"><ActionButton label="Edit product" onClick={() => setEditing(product)}><FiEdit2 /></ActionButton><ActionButton label="Delete product" danger onClick={() => void remove(product)}><FiTrash2 /></ActionButton></div></td></tr>)}</tbody></table></div>
    ) : (
      <div className="resource-grid product-grid">{list.map((product) => <article className="resource-card product-card" key={product.id}><div className="product-card-media">{product.image_url ? <img src={product.image_url} alt={product.name} /> : <span className="avatar-soft">P</span>}</div><div className="resource-card-body"><div className="resource-card-head"><div><strong>{product.name}</strong><small>{product.category}</small></div><StatusPill value={product.is_member_exclusive ? 'member-only' : 'public'} /></div><p>{product.description || 'No product description yet.'}</p><div className="resource-card-foot"><strong className="money-cell">{money(product.price)}</strong><div className="row-actions"><ActionButton label="Edit product" onClick={() => setEditing(product)}><FiEdit2 /></ActionButton><ActionButton label="Delete product" danger onClick={() => void remove(product)}><FiTrash2 /></ActionButton></div></div></div></article>)}</div>
    )
  )}</section>{editing !== undefined && <ProductEditor product={editing} onClose={() => setEditing(undefined)} onSaved={(saved) => { setItems((current) => [saved, ...current.filter((item) => item.id !== saved.id)]); setEditing(undefined); }} />}</div>;
}

function ProductEditor({ product, onClose, onSaved }: { product: ProductRecord | null; onClose: () => void; onSaved: (product: ProductRecord) => void }) {
  const [id] = useState(product?.id ?? newId());
  const [draft, setDraft] = useState({ name: product?.name ?? '', description: product?.description ?? '', price: String(product?.price ?? ''), category: product?.category ?? 'Apparel', sizes: stringList(product?.sizes).join(', '), colors: stringList(product?.colors).join(', '), is_member_exclusive: product?.is_member_exclusive ?? false });
  const [image] = useState(product?.image_url ?? ''); const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const set = (key: keyof typeof draft) => (value: string) => setDraft((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      let imageUrl = image;
      if (file) { const ticket = await adminApi.createUpload('product', id, file); await uploadImage(ticket, file); imageUrl = ticket.publicUrl; }
      const saved = await adminApi.saveProduct({
        id,
        ...draft,
        price: Number(draft.price),
        sizes: draft.sizes.split(',').map((item) => item.trim()).filter(Boolean),
        colors: draft.colors.split(',').map((item) => item.trim()).filter(Boolean),
        image_url: imageUrl || null,
      });
      onSaved(saved);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save product.'); setBusy(false); }
  }
  return <Modal title={product ? 'Edit product' : 'New product'} onClose={onClose}><form className="modal-form" onSubmit={submit}>{error && <Notice>{error}</Notice>}<div className="form-grid"><FormField label="Product name" value={draft.name} onChange={set('name')} required /><FormField label="Price (KES)" type="number" min="1" value={draft.price} onChange={set('price')} required /><FormField label="Category" value={draft.category} onChange={set('category')} required /><FormField label="Sizes (comma separated)" value={draft.sizes} onChange={set('sizes')} /><FormField label="Colors (comma separated)" value={draft.colors} onChange={set('colors')} /></div><FormArea label="Description" value={draft.description} onChange={set('description')} rows={3} /><label className="form-field"><span>Product image (JPG, PNG or WebP · max 5 MB)</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>{image && !file && <img className="editor-preview" src={image} alt="Current product" />}<label className="checkbox-field"><input type="checkbox" checked={draft.is_member_exclusive} onChange={(event) => setDraft((current) => ({ ...current, is_member_exclusive: event.target.checked }))} /><span>Members only</span></label><ModalActions busy={busy} onClose={onClose} label="Save product" /></form></Modal>;
}

function MessagesPage({ search }: { search: string }) {
  const [items, setItems] = useState<ContactMessage[]>([]); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); const [selected, setSelected] = useState<ContactMessage | null>(null);
  async function load() { setLoading(true); setError(''); try { setItems(await adminApi.messages()); } catch (err) { setError(err instanceof Error ? err.message : 'Could not load messages.'); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  const list = items.filter((message) => `${message.name} ${message.email} ${message.subject} ${message.message}`.toLowerCase().includes(search.trim().toLowerCase()));
  async function toggleRead(message: ContactMessage) {
    try { const updated = await adminApi.updateMessage(message.id, !message.is_read); setItems((current) => current.map((item) => item.id === message.id ? updated : item)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not update this message.'); }
  }
  async function remove(message: ContactMessage) {
    if (!window.confirm(`Delete the message from ${message.name}?`)) return;
    try { await adminApi.deleteMessage(message.id); setItems((current) => current.filter((item) => item.id !== message.id)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not delete this message.'); }
  }
  return <div className="page-stack"><PageHeader title="Inbox" description="Read and organize messages sent through the public website." /><div className="message-list"><LoadState loading={loading} error={error} empty={!list.length} retry={() => void load()} emptyTitle="Your inbox is clear" emptyDescription="Messages submitted through the website will appear here." emptyIcon={FiMail} />{!loading && !error && list.map((message) => <article className={`message-card${message.is_read ? '' : ' is-unread'}`} key={message.id}><button className="message-main" type="button" onClick={() => { setSelected(message); if (!message.is_read) void toggleRead(message); }}><span className="message-avatar">{message.name.slice(0, 1).toUpperCase()}</span><span className="message-content"><strong>{message.subject}</strong><small>{message.name} · {message.email}</small><span>{message.message}</span></span><time>{dateLabel(message.created_at)}</time></button><div className="row-actions"><ActionButton label={message.is_read ? 'Mark unread' : 'Mark read'} onClick={() => void toggleRead(message)}>{message.is_read ? <FiArrowDown /> : <FiCheck />}</ActionButton><ActionButton label="Delete message" danger onClick={() => void remove(message)}><FiTrash2 /></ActionButton></div></article>)}</div>{selected && <Modal title={selected.subject} onClose={() => setSelected(null)}><div className="message-detail"><p><strong>From</strong> {selected.name} · <a href={`mailto:${selected.email}`}>{selected.email}</a></p><p><strong>Received</strong> {dateLabel(selected.created_at)}</p><p>{selected.message}</p><div className="modal-actions"><a className="button-primary" href={`mailto:${selected.email}?subject=${encodeURIComponent(`Re: ${selected.subject}`)}`}>Reply by email</a><button type="button" className="button-secondary" onClick={() => setSelected(null)}>Close</button></div></div></Modal>}</div>;
}

function FilePicker({ label, files, onChange, existing, onRemoveExisting }: {
  label: string; files: File[]; onChange: (files: File[]) => void; existing: string[]; onRemoveExisting: (url: string) => void;
}) {
  return <div className="form-field"><span>{label} (JPG, PNG or WebP · max 5 MB each)</span>{existing.length > 0 && <div className="file-thumb-list">{existing.map((url) => <div key={url} className="file-thumb"><img src={url} alt="" /><button type="button" aria-label="Remove image" onClick={() => onRemoveExisting(url)}><FiX /></button></div>)}</div>}<label className="file-drop"><FiUpload /><span>{files.length ? `${files.length} image(s) selected` : 'Choose images to upload'}</span><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => onChange(Array.from(event.target.files ?? []))} /></label>{files.map((file) => <small className="upload-file-name" key={`${file.name}-${file.size}`}>{file.name}</small>)}</div>;
}

function StatusPill({ value }: { value: string }) {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const label = value.replace(/-/g, ' ');
  return <span className={`status-pill status-${normalized}`}>{label}</span>;
}

function MetricTile({ label, value, icon }: { label: string; value: string; icon: string }) {
  return <article className="metric-card"><span className="metric-icon">{icon}</span><p>{label}</p><strong>{value}</strong></article>;
}
