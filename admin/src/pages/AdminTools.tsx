import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { FiDownload, FiGlobe, FiInfo, FiKey, FiShield, FiUsers, FiX } from 'react-icons/fi';
import { sileo } from 'sileo';
import { adminApi } from '../lib/api';
import { getSupabase } from '../lib/supabase';
import Notice from '../components/Notice';
import { ADMIN_ROLE_OPTIONS, getAdminRoleLabel } from '../types';
import type {
  AdminAccount, AdminAuditLog, AdminProfile, AdminRole, AdminView, DashboardData,
  EventRecord, Executive, Payment, ProductRecord, Project,
} from '../types';

const dateLabel = (value: string) => new Date(value).toLocaleString('en-KE', {
  dateStyle: 'medium',
  timeStyle: 'short',
});
const money = (value: number) => `KES ${Number(value || 0).toLocaleString('en-KE')}`;

function PageHeader({ title, description, children }: {
  title: string; description: string; children?: ReactNode;
}) {
  return <div className="page-heading">
    <div><p className="eyebrow">IEC JKUAT ADMIN</p><h1>{title}</h1><p>{description}</p></div>
    {children && <div className="page-actions">{children}</div>}
  </div>;
}

function Metric({ label, value, icon }: { label: string; value: string; icon: string }) {
  return <article className="metric-card"><span className="metric-icon">{icon}</span><p>{label}</p><strong>{value}</strong></article>;
}

function CustomRoleSelect({ value, onChange, disabled, title }: {
  value: AdminRole; onChange: (value: AdminRole) => void; disabled?: boolean; title?: string;
}) {
  const [open, setOpen] = useState(false);
  const options = ADMIN_ROLE_OPTIONS.map((role) => role.value);

  return (
    <div className="custom-select-wrap" title={title}>
      <button type="button" className="custom-role-select" disabled={disabled} aria-label="Select administrator role" onClick={() => setOpen((current) => !current)}>
        <span>{getAdminRoleLabel(value)}</span>
        {!disabled && <FiShield aria-hidden="true" />}
      </button>
      {open && !disabled && (
        <div className="custom-select-menu role-select-menu" role="listbox" aria-label="Administrator roles">
          {options.map((option) => (
            <button key={option} type="button" className={`custom-select-option${option === value ? ' is-selected' : ''}`} onClick={() => { onChange(option); setOpen(false); }}>
              {getAdminRoleLabel(option)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>) {
  const csv = rows.map((row) => row.map((cell) => {
    let value = String(cell ?? '');
    if (/^\s*[=+\-@]/.test(value)) value = `'${value}`;
    return `"${value.replace(/"/g, '""')}"`;
  }).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AdminTools({ view, profile, search, onNavigate }: {
  view: AdminView;
  profile: AdminProfile;
  search: string;
  onNavigate: (view: AdminView) => void;
}) {
  if (view === 'reports') return <ReportsPage />;
  if (view === 'content') return <WebsiteContentPage onNavigate={onNavigate} />;
  if (view === 'settings') return <SettingsPage profile={profile} />;
  if (view === 'roles') return <RolesPage profile={profile} search={search} />;
  return null;
}

function ReportsPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function load() {
    setLoading(true);
    setError('');
    try {
      const [summary, paymentRows] = await Promise.all([adminApi.dashboard(), adminApi.payments()]);
      setDashboard(summary);
      setPayments(paymentRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load reports.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  const monthlyRows = useMemo(() => (dashboard?.monthly ?? []).map((item) => [
    item.period || item.month, item.members, item.payments, item.collected,
  ]), [dashboard]);

  return <div className="page-stack">
    <PageHeader title="Reports & exports" description="Review six-month membership and payment trends, then download a CSV snapshot." />
    {error && <Notice>{error}</Notice>}
    {loading && <p className="table-empty">Loading reports…</p>}
    {!loading && !error && dashboard && <>
      <div className="metric-grid mini-metrics">
        <Metric label="Registered members" value={dashboard.members.toLocaleString()} icon="01" />
        <Metric label="Active members" value={dashboard.activeMembers.toLocaleString()} icon="02" />
        <Metric label="Completed payments" value={dashboard.completedPayments.toLocaleString()} icon="03" />
        <Metric label="Collected · last 6 months" value={money(dashboard.collectedLastSixMonths)} icon="KES" />
      </div>
      <section className="panel">
        <div className="panel-heading"><div><h2>Membership and payment activity</h2><p>Monthly totals for the last six calendar months.</p></div></div>
        <div className="table-scroll">
          <table className="data-table"><thead><tr><th>Month</th><th>New members</th><th>Completed payments</th><th>Collected</th></tr></thead>
            <tbody>{dashboard.monthly.map((item) => <tr key={item.month}><td><strong>{item.month}</strong></td><td>{item.members}</td><td>{item.payments}</td><td className="money-cell">{money(item.collected)}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="report-actions">
          <button className="button-primary" type="button" onClick={() => downloadCsv(
            `iec-monthly-report-${new Date().toISOString().slice(0, 10)}.csv`,
            [['Month', 'New members', 'Completed payments', 'Collected (KES)'], ...monthlyRows],
          )}><FiDownload /> Export monthly report</button>
          <button className="button-secondary" type="button" onClick={() => downloadCsv(
            `iec-payments-latest-${new Date().toISOString().slice(0, 10)}.csv`,
            [
              ['Member', 'Registration number', 'Amount (KES)', 'Status', 'Date', 'Payment reference'],
              ...payments.map((payment) => [
                payment.members?.full_name || 'Member unavailable',
                payment.members?.reg_number || '',
                payment.amount,
                payment.payment_status,
                payment.created_at,
                payment.lipana_ref || '',
              ]),
            ],
          )} disabled={!payments.length}><FiDownload /> Export latest 300 payments</button>
        </div>
        <p className="panel-footnote">The payment export contains up to 300 most recent records. Six-month totals are calculated from dashboard data.</p>
      </section>
    </>}
  </div>;
}

function WebsiteContentPage({ onNavigate }: { onNavigate: (view: AdminView) => void }) {
  const [items, setItems] = useState<{ projects: Project[]; events: EventRecord[]; products: ProductRecord[]; executives: Executive[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function load() {
    setLoading(true);
    setError('');
    try {
      const [projects, events, products, executives] = await Promise.all([
        adminApi.projects(), adminApi.events(), adminApi.products(), adminApi.executives(),
      ]);
      setItems({ projects, events, products, executives });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load website content.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);
  const cards = items ? [
    { title: 'Projects', total: items.projects.length, live: items.projects.filter((item) => item.is_published).length, label: 'published', view: 'projects' as const },
    { title: 'Events', total: items.events.length, live: items.events.filter((item) => item.event_date >= new Date().toISOString().slice(0, 10)).length, label: 'upcoming', view: 'events' as const },
    { title: 'Products', total: items.products.length, live: items.products.length, label: 'in catalogue', view: 'products' as const },
    { title: 'Leadership', total: items.executives.length, live: items.executives.filter((item) => item.is_active).length, label: 'visible', view: 'leadership' as const },
  ] : [];
  return <div className="page-stack">
    <PageHeader title="Website content" description="A single view of the records currently managed for the public website." />
    {error && <Notice>{error}</Notice>}
    {loading && <p className="table-empty">Loading website content…</p>}
    {!loading && !error && items && <>
      <div className="content-overview-grid">{cards.map((card) => <article className="panel content-overview-card" key={card.title}>
        <div className="content-overview-icon"><FiGlobe /></div>
        <p>{card.title}</p>
        <strong>{card.total.toLocaleString()}</strong>
        <span>{card.live.toLocaleString()} {card.label}</span>
        <button className="text-link" type="button" onClick={() => onNavigate(card.view)}>Manage {card.title.toLowerCase()} <span aria-hidden="true">→</span></button>
      </article>)}</div>
      <section className="panel content-note">
        <FiGlobe aria-hidden="true" />
        <div><h2>Public content at a glance</h2><p>Counts reflect the most recent records returned by each admin list. Open a section to edit visibility and details.</p></div>
      </section>
    </>}
  </div>;
}

function SettingsPage({ profile }: { profile: AdminProfile }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [details, setDetails] = useState({
    full_name: profile.full_name || profile.email?.split('@')[0]?.replace(/[._-]/g, ' ') || 'Administrator',
    title: profile.title || 'Executive Administrator',
    phone: profile.phone || '+254 700 000000',
    department: profile.department || 'Administration',
    timezone: profile.timezone || 'Africa/Nairobi',
    bio: profile.bio || 'Manages club operations, governance, and digital platform access.',
  });

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }
    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const { error: updateError } = await getSupabase().auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword('');
      setConfirmation('');
      setSuccess('Your password has been updated.');
      sileo.success({
        title: 'Password updated',
        description: 'Your administrator password was updated successfully.',
        duration: 3200,
      });
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : 'Could not update your password.';
      setError(message);
      sileo.error({ title: 'Password update failed', description: message });
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      const updatedProfile = {
        ...profile,
        full_name: details.full_name.trim() || 'Administrator',
        title: details.title.trim() || 'Executive Administrator',
        phone: details.phone.trim(),
        department: details.department.trim(),
        timezone: details.timezone.trim(),
        bio: details.bio.trim(),
      };
      setDetails({
        full_name: updatedProfile.full_name,
        title: updatedProfile.title,
        phone: updatedProfile.phone,
        department: updatedProfile.department,
        timezone: updatedProfile.timezone,
        bio: updatedProfile.bio,
      });
      setIsEditing(false);
      setSuccess('Your profile details were updated successfully.');
      sileo.success({
        title: 'Profile saved',
        description: 'Your administrator profile details are ready for the portal.',
        duration: 3200,
      });
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Could not save the administrator profile.';
      setError(message);
      sileo.error({ title: 'Profile save failed', description: message });
    }
  }

  const initials = (details.full_name?.split(' ')[0]?.slice(0, 1).toUpperCase() || profile.email?.split('@')[0]?.slice(0, 1).toUpperCase() || 'AD');
  const roleLabel = getAdminRoleLabel(profile.role);

  return <div className="page-stack">
    <PageHeader title="Settings & security" description="Maintain your account details, security, and full administrative access for the IEC portal." />
    <section className="panel settings-panel">
      <div className="account-summary-card">
        <div className="account-avatar" aria-label="Administrator profile initial">{initials}</div>
        <div className="account-summary-copy">
          <p className="eyebrow">Profile</p>
          <h2>{details.full_name}</h2>
          <div className="account-metadata">
            <span className="status-pill status-super_admin">{roleLabel}</span>
            <span className="status-pill status-manager">{details.department}</span>
          </div>
        </div>
        <button type="button" className="button-secondary" onClick={() => setIsEditing((current) => !current)}>{isEditing ? 'Cancel' : 'Edit profile'}</button>
      </div>

      {isEditing ? (
        <form className="settings-form profile-form" onSubmit={saveProfile}>
          {error && <Notice>{error}</Notice>}
          {success && <Notice tone="success">{success}</Notice>}
          <div className="form-grid">
            <label className="form-field"><span>Full name</span><input value={details.full_name} onChange={(event) => setDetails((current) => ({ ...current, full_name: event.target.value }))} /></label>
            <label className="form-field"><span>Title</span><input value={details.title} onChange={(event) => setDetails((current) => ({ ...current, title: event.target.value }))} /></label>
            <label className="form-field"><span>Phone</span><input value={details.phone} onChange={(event) => setDetails((current) => ({ ...current, phone: event.target.value }))} /></label>
            <label className="form-field"><span>Department</span><input value={details.department} onChange={(event) => setDetails((current) => ({ ...current, department: event.target.value }))} /></label>
            <label className="form-field"><span>Timezone</span><input value={details.timezone} onChange={(event) => setDetails((current) => ({ ...current, timezone: event.target.value }))} /></label>
            <label className="form-field"><span>Email</span><input value={profile.email} readOnly /></label>
          </div>
          <label className="form-field"><span>Bio</span><textarea rows={4} value={details.bio} onChange={(event) => setDetails((current) => ({ ...current, bio: event.target.value }))} /></label>
          <div className="settings-actions">
            <button className="button-primary" type="submit">Save profile</button>
          </div>
        </form>
      ) : (
        <div className="settings-layout">
          <div className="settings-card">
            <div className="settings-title"><span className="content-overview-icon"><FiShield /></span><div><h2>Profile details</h2><p>Operational contact and administrative overview.</p></div></div>
            <ul className="settings-list">
              <li><span>Full name</span><strong>{details.full_name}</strong></li>
              <li><span>Title</span><strong>{details.title}</strong></li>
              <li><span>Email</span><strong>{profile.email}</strong></li>
              <li><span>Phone</span><strong>{details.phone}</strong></li>
              <li><span>Department</span><strong>{details.department}</strong></li>
              <li><span>Timezone</span><strong>{details.timezone}</strong></li>
            </ul>
          </div>

          <div className="settings-card">
            <div className="settings-title"><span className="content-overview-icon"><FiKey /></span><div><h2>Account security</h2><p>Keep your admin sign-in protected and private.</p></div></div>
            <form className="settings-form" onSubmit={changePassword}>
              {error && <Notice>{error}</Notice>}
              {success && <Notice tone="success">{success}</Notice>}
              <label className="form-field"><span>New password</span><input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
              <label className="form-field"><span>Confirm new password</span><input type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
              <button className="button-primary" type="submit" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button>
            </form>
          </div>
        </div>
      )}

      {!isEditing && (
        <div className="settings-card full-width">
          <div className="settings-title"><span className="content-overview-icon"><FiShield /></span><div><h2>Administrative access</h2><p>All platform operations available to this admin account.</p></div></div>
          <ul className="settings-list">
            <li><span>Role</span><strong>{roleLabel}</strong></li>
            <li><span>Access control</span><strong>Full administrative control</strong></li>
            <li><span>Content management</span><strong>Website, projects, events, products and leadership</strong></li>
            <li><span>Member management</span><strong>Members, applications, payments and export tools</strong></li>
            <li><span>Security overview</span><strong>Protected with password management and audit logs</strong></li>
          </ul>
        </div>
      )}
    </section>
  </div>;
}

function RolesPage({ profile, search }: { profile: AdminProfile; search: string }) {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [audit, setAudit] = useState<AdminAuditLog[]>([]);
  const [draftRoles, setDraftRoles] = useState<Record<string, AdminRole>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedAudit, setSelectedAudit] = useState<AdminAuditLog | null>(null);
  async function load() {
    setLoading(true);
    setError('');
    try {
      const [accounts, entries] = await Promise.all([adminApi.admins(), adminApi.auditLog()]);
      setAdmins(accounts);
      setAudit(entries);
      setDraftRoles(Object.fromEntries(accounts.map((account) => [account.user_id, account.role])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load roles and audit history.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  async function saveRole(account: AdminAccount) {
    const role = draftRoles[account.user_id];
    if (!role || role === account.role) return;
    if (!window.confirm(`Change ${account.email} from ${account.role} to ${role}?`)) return;
    setBusyId(account.user_id);
    setError('');
    setSuccess('');
    try {
      const updated = await adminApi.updateAdminRole(account.user_id, role);
      setAdmins((current) => current.map((item) => item.user_id === account.user_id ? { ...item, ...updated } : item));
      setSuccess(`Updated ${account.email} to ${role}.`);
      sileo.success({
        title: 'Role updated',
        description: `${account.email} is now ${getAdminRoleLabel(role)}.`,
        duration: 3200,
      });
      try {
        setAudit(await adminApi.auditLog());
      } catch (refreshError) {
        const message = refreshError instanceof Error
          ? `Role updated, but the audit history could not be refreshed: ${refreshError.message}`
          : 'Role updated, but the audit history could not be refreshed.';
        setError(message);
        sileo.warning({ title: 'Audit refresh warning', description: message, duration: 4200 });
      }
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Could not update the administrator role.';
      setError(message);
      sileo.error({ title: 'Role update failed', description: message });
    } finally {
      setBusyId('');
    }
  }

  const term = search.trim().toLowerCase();
  const filteredAdmins = admins.filter((item) => `${item.email} ${item.role}`.toLowerCase().includes(term));
  const filteredAudit = audit.filter((item) => `${item.actor_email} ${item.action} ${item.resource_type} ${item.resource_id ?? ''}`.toLowerCase().includes(term));
  const ownerCount = admins.filter((account) => ['owner', 'super_admin'].includes(account.role)).length;

  return <div className="page-stack">
    <PageHeader title="Roles & audit log" description="Assign roles to existing admin accounts and review recorded admin changes." />
    {error && <Notice>{error}</Notice>}
    {success && <Notice tone="success">{success}</Notice>}
    {loading && <p className="table-empty">Loading administrator records…</p>}
    {!loading && (!error || admins.length > 0 || audit.length > 0) && <>
      <section className="panel data-panel">
        <div className="panel-heading roles-panel-heading"><div><h2><FiUsers /> Administrator accounts</h2><p>Role changes are restricted to the Super Admin. At least one Super Admin must remain.</p></div><span className="status-pill status-active">Signed in · {getAdminRoleLabel(profile.role)}</span></div>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>Email</th><th>Current role</th><th>Change role</th><th>Action</th></tr></thead>
          <tbody>{filteredAdmins.map((account) => {
            const selectedRole = draftRoles[account.user_id] ?? (account.role === 'owner' ? 'super_admin' : account.role);
            const isSuperAdmin = ['owner', 'super_admin'].includes(account.role);
            return <tr key={account.user_id}>
            <td><strong>{account.email}</strong>{account.user_id === profile.user_id && <small>Current account</small>}</td>
            <td><span className={`status-pill status-${account.role}`}>{getAdminRoleLabel(account.role)}</span></td>
            <td><CustomRoleSelect value={selectedRole} onChange={(value) => setDraftRoles((current) => ({ ...current, [account.user_id]: value }))} disabled={account.user_id === profile.user_id || (isSuperAdmin && ownerCount <= 1)} title={account.user_id === profile.user_id ? 'You cannot change your own Super Admin role.' : isSuperAdmin && ownerCount <= 1 ? 'At least one Super Admin must remain.' : undefined} /></td>
            <td><button className="button-secondary" type="button" disabled={busyId === account.user_id || account.user_id === profile.user_id || (isSuperAdmin && ownerCount <= 1) || selectedRole === account.role} onClick={() => void saveRole(account)}>{busyId === account.user_id ? 'Saving…' : 'Save role'}</button></td>
          </tr>;
          })}
          {!filteredAdmins.length && <tr><td colSpan={4} className="table-empty">No administrator accounts match this search.</td></tr>}
          </tbody>
        </table></div>
      </section>
      <section className="panel data-panel">
        <div className="panel-heading roles-panel-heading"><div><h2><FiShield /> Recent audit history</h2><p>Latest 500 recorded content, member, message, and role changes.</p></div></div>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>Date</th><th>Administrator</th><th>Action</th><th>Resource</th><th>Details</th></tr></thead>
          <tbody>{filteredAudit.map((entry) => <tr key={entry.id}>
            <td>{dateLabel(entry.created_at)}</td><td>{entry.actor_email}</td>
            <td><span className="status-pill">{entry.action.replace(/-/g, ' ')}</span></td>
            <td>{entry.resource_type}{entry.resource_id ? <small>{entry.resource_id}</small> : null}</td>
            <td><button className="button-secondary details-button" type="button" onClick={() => setSelectedAudit(entry)}><FiInfo /> Details</button></td>
          </tr>)}
          {!filteredAudit.length && <tr><td colSpan={5} className="table-empty">No audit entries match this search.</td></tr>}
          </tbody>
        </table></div>
      </section>
    </>}
    {selectedAudit && (
      <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
        if (event.target === event.currentTarget) setSelectedAudit(null);
      }}>
        <section className="modal-card audit-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="audit-detail-title">
          <div className="modal-heading">
            <div><p className="eyebrow">Audit log entry</p><h2 id="audit-detail-title">{selectedAudit.action.replace(/-/g, ' ')}</h2></div>
            <button type="button" className="icon-button" aria-label="Close details" onClick={() => setSelectedAudit(null)}><FiX /></button>
          </div>
          <dl className="details-grid audit-detail-grid">
            <div><dt>Administrator</dt><dd>{selectedAudit.actor_email}</dd></div>
            <div><dt>Date and time</dt><dd>{dateLabel(selectedAudit.created_at)}</dd></div>
            <div><dt>Resource</dt><dd>{selectedAudit.resource_type}</dd></div>
            <div><dt>Resource ID</dt><dd>{selectedAudit.resource_id || 'Not recorded'}</dd></div>
          </dl>
          <section className="details-section">
            <h3>Recorded changes</h3>
            {Object.keys(selectedAudit.details ?? {}).length
              ? <pre className="details-json">{JSON.stringify(selectedAudit.details, null, 2)}</pre>
              : <p>No additional change details were recorded for this action.</p>}
          </section>
        </section>
      </div>
    )}
  </div>;
}
