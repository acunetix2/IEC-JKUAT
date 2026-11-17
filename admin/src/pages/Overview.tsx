import { useEffect, useMemo, useState } from 'react';
import { FiArrowUpRight, FiBriefcase, FiCreditCard, FiDownload, FiUserCheck, FiUserPlus, FiUsers } from 'react-icons/fi';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { adminApi } from '../lib/api';
import type { DashboardData, Member, Payment } from '../types';
import Notice from '../components/Notice';
import EmptyState from '../components/EmptyState';

const money = (amount: number) => `KES ${amount.toLocaleString('en-KE')}`;
const dateLabel = (value?: string) => value
  ? new Date(value).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—';

function exportCsv(filename: string, rows: Array<Array<string | number | null | undefined>>) {
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

export default function Overview({ data }: { data: DashboardData }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([adminApi.members(0), adminApi.payments()])
      .then(([memberResult, paymentResult]) => {
        if (!active) return;
        setMembers(memberResult.items.slice(0, 5));
        setPayments(paymentResult.slice(0, 5));
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Could not load recent activity.');
      });
    return () => { active = false; };
  }, []);

  const chartData = useMemo(
    () => data.monthly.map((month) => ({
      name: month.month,
      members: month.members,
      payments: month.payments,
      collected: month.collected,
    })),
    [data.monthly],
  );

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div><p className="eyebrow">YOUR CLUB, AT A GLANCE</p><h1>Good morning.</h1><p>Here’s what’s happening across IEC JKUAT.</p></div>
        <div className="page-actions">
          <button
            type="button"
            className="button-secondary"
            onClick={() => exportCsv(
              `iec-activity-${new Date().toISOString().slice(0, 10)}.csv`,
              [
                ['Month', 'New members', 'Completed payments', 'Collected (KES)'],
                ...data.monthly.map((month) => [month.month, month.members, month.payments, month.collected]),
              ],
            )}
          >
            <FiDownload aria-hidden="true" /> Export report
          </button>
          <span className="today-label">{new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
      </div>
      {error && <Notice>{error}</Notice>}

      <section className="metric-grid" aria-label="Club analytics">
        <Metric icon={FiUsers} label="Registered members" value={data.members.toLocaleString()} note={`${data.activeMembers.toLocaleString()} active members`} tone="blue" />
        <Metric icon={FiCreditCard} label="Completed payments" value={data.completedPayments.toLocaleString()} note="Confirmed by M-Pesa" tone="green" />
        <Metric icon={FiBriefcase} label="Projects" value={data.projects.toLocaleString()} note={`${data.publishedProjects} published on the website`} tone="lavender" />
        <Metric icon={FiUserCheck} label="Collected · 6 months" value={money(data.collectedLastSixMonths)} note="Confirmed membership payments" tone="sand" />
      </section>

      <section className="overview-grid">
        <article className="panel activity-panel">
          <div className="panel-heading">
            <div><h2>Community activity</h2><p>New members and confirmed payments</p></div>
            <span className="panel-period">LAST 6 MONTHS</span>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={270}>
              <AreaChart data={chartData} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="membersFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#a69ef2" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#a69ef2" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="paymentsFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#4f5dd4" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#4f5dd4" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#eceaf7" vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#6f7480', fontSize: 11, fontWeight: 600 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#6f7480', fontSize: 11, fontWeight: 600 }} />
                <Tooltip
                  labelStyle={{ color: '#1e2230', fontWeight: 700 }}
                  contentStyle={{ borderRadius: 12, border: '1px solid #eae7fb', boxShadow: '0 14px 28px rgba(42, 36, 74, 0.08)' }}
                />
                <Area type="monotone" dataKey="members" stroke="#9d93ee" strokeWidth={2.5} fill="url(#membersFill)" />
                <Area type="monotone" dataKey="payments" stroke="#4d5dd8" strokeWidth={2.5} fill="url(#paymentsFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend"><span><i className="legend-members" /> New members</span><span><i className="legend-payments" /> Paid memberships</span></div>
        </article>

        <article className="panel project-summary">
          <div className="panel-heading"><div><h2>Project portfolio</h2><p>Ideas in motion</p></div><FiBriefcase aria-hidden="true" /></div>
          <strong className="project-summary-number">{data.projects.toLocaleString()}</strong>
          <p className="project-summary-caption">projects in the workspace</p>
          <div className="publish-progress"><span style={{ width: `${data.projects ? Math.min(100, (data.publishedProjects / data.projects) * 100) : 0}%` }} /></div>
          <p className="publish-label">{data.publishedProjects} published <span>{Math.max(0, data.projects - data.publishedProjects)} drafts</span></p>
        </article>
      </section>

      <section className="overview-grid overview-tables">
        <article className="panel">
          <div className="panel-heading"><div><h2>New members</h2><p>Latest registrations</p></div><FiUsers aria-hidden="true" /></div>
          {members.length ? (
            <div className="compact-list">
              {members.map((member) => (
                <div className="compact-row" key={member.id}>
                  <span className="avatar-soft">{member.full_name.slice(0, 1).toUpperCase()}</span>
                  <span className="compact-copy"><strong>{member.full_name}</strong><small>{member.reg_number}</small></span>
                  <span className="compact-date">{dateLabel(member.created_at)}</span>
                </div>
              ))}
            </div>
          ) : <EmptyState
            compact
            icon={FiUserPlus}
            title="No member registrations yet"
            description="New signups from the website will appear here automatically."
          />}
        </article>

        <article className="panel">
          <div className="panel-heading"><div><h2>Recent payments</h2><p>M-Pesa transaction activity</p></div><FiCreditCard aria-hidden="true" /></div>
          {payments.length ? (
            <div className="compact-list">
              {payments.map((payment) => (
                <div className="compact-row" key={payment.id}>
                  <span className={`payment-avatar ${payment.payment_status === 'completed' ? 'is-paid' : ''}`}><FiCreditCard aria-hidden="true" /></span>
                  <span className="compact-copy"><strong>{payment.members?.full_name || payment.phone}</strong><small>{payment.members?.reg_number || 'Member record unavailable'}</small></span>
                  <span className={`status-pill status-${payment.payment_status}`}>{payment.payment_status}</span>
                </div>
              ))}
            </div>
          ) : <EmptyState
            compact
            icon={FiCreditCard}
            title="No payment activity yet"
            description="Confirmed member payments will appear here."
          />}
          <a className="text-link" href="#payments">View payment activity <FiArrowUpRight aria-hidden="true" /></a>
        </article>
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: typeof FiUsers;
  label: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <article className="metric-card">
      <div className={`metric-icon metric-${tone}`}><Icon aria-hidden="true" /></div>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}
