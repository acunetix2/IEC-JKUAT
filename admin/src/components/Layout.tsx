import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  FiBarChart2,
  FiBell,
  FiBriefcase,
  FiCalendar,
  FiChevronDown,
  FiCreditCard,
  FiCornerDownLeft,
  FiExternalLink,
  FiFileText,
  FiGlobe,
  FiLogOut,
  FiMail,
  FiPackage,
  FiSearch,
  FiSettings,
  FiShield,
  FiShoppingBag,
  FiX,
  FiUsers,
  FiUserCheck,
  FiUserPlus,
} from 'react-icons/fi';
import { canAccessAdminView, getAdminRoleLabel } from '../types';
import type { AdminRole, AdminView } from '../types';

const assetUrl = (path: string) => `${import.meta.env.DEV ? import.meta.env.BASE_URL : '/'}${path}`;

const NAV_ITEMS: Array<{ id: AdminView; label: string; icon: typeof FiUsers; group: 'club' | 'operations' | 'content' | 'controls' }> = [
  { id: 'overview', label: 'Overview', icon: FiBarChart2, group: 'club' },
  { id: 'members', label: 'Members', icon: FiUsers, group: 'club' },
  { id: 'applications', label: 'Applications', icon: FiUserPlus, group: 'club' },
  { id: 'payments', label: 'Payments', icon: FiCreditCard, group: 'operations' },
  { id: 'projects', label: 'Projects', icon: FiBriefcase, group: 'operations' },
  { id: 'executives', label: 'Executives', icon: FiUserCheck, group: 'club' },
  { id: 'events', label: 'Events', icon: FiCalendar, group: 'operations' },
  { id: 'products', label: 'Products', icon: FiShoppingBag, group: 'content' },
  { id: 'orders', label: 'Orders', icon: FiPackage, group: 'operations' },
  { id: 'messages', label: 'Messages', icon: FiMail, group: 'operations' },
  { id: 'notifications', label: 'Notifications', icon: FiBell, group: 'controls' },
  { id: 'reports', label: 'Reports', icon: FiFileText, group: 'controls' },
  { id: 'content', label: 'Website', icon: FiGlobe, group: 'content' },
  { id: 'settings', label: 'Settings', icon: FiSettings, group: 'controls' },
  { id: 'roles', label: 'Roles', icon: FiShield, group: 'controls' },
];

const TITLES: Record<AdminView, string> = {
  overview: 'Overview',
  members: 'Members',
  applications: 'Membership Applications',
  payments: 'Payments',
  projects: 'Projects',
  executives: 'Executives',
  leadership: 'Executives',
  events: 'Events',
  products: 'Products',
  orders: 'Merchandise Orders',
  messages: 'Messages',
  notifications: 'Notifications',
  reports: 'Reports & exports',
  content: 'Website content',
  settings: 'Settings & security',
  roles: 'Roles & audit log',
};

const defaultNotifications = [
  { id: 'n-1', title: 'Membership report ready', description: 'Revenue and member growth have been refreshed.', unread: true, time: '2 min ago' },
  { id: 'n-2', title: 'New application received', description: 'A new leadership application needs review.', unread: true, time: '18 min ago' },
  { id: 'n-3', title: 'Project deadline reminder', description: 'The IEC Startup Sprint review is due this Friday.', unread: false, time: '1 day ago' },
];

interface LayoutProps {
  active: AdminView;
  email: string;
  role: AdminRole;
  children: ReactNode;
  onNavigate: (view: AdminView) => void;
  onSearch: (value: string) => void;
  onSignOut: () => void;
  notifications?: Array<{ id: string; title: string; description: string; unread: boolean; time: string }>;
  onMarkAllRead?: () => void;
  onReadNotification?: (id: string) => void;
}

export default function Layout({ active, email, role, children, onNavigate, onSearch, onSignOut, notifications = defaultNotifications, onMarkAllRead, onReadNotification }: LayoutProps) {
  const initials = email.slice(0, 1).toUpperCase() || 'A';
  const roleLabel = getAdminRoleLabel(role) || 'Administrator';
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [commandIndex, setCommandIndex] = useState(0);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    club: false,
    operations: false,
    content: false,
    controls: false,
  });

  const navItems = useMemo(() => NAV_ITEMS.filter(({ id }) => canAccessAdminView(role, id)), [role]);
  const unreadCount = notifications.filter((item) => item.unread).length;
  const groupLabels: Record<string, string> = {
    club: 'Club',
    operations: 'Operations',
    content: 'Content',
    controls: 'Controls',
  };
  const commandItems = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    const pages: Array<{
      kind: 'navigate' | 'search';
      id: AdminView;
      label: string;
      description: string;
      icon: typeof FiUsers;
    }> = navItems
      .filter((item) => !query || `${item.label} ${TITLES[item.id]} ${item.group}`.toLowerCase().includes(query))
      .map((item) => ({
        kind: 'navigate' as const,
        id: item.id,
        label: item.label,
        description: `${groupLabelsFor(item.group)} · ${TITLES[item.id]}`,
        icon: item.icon,
      }));

    if (query && active !== 'overview') {
      pages.unshift({
        kind: 'search',
        id: active,
        label: `Search ${TITLES[active]} for “${commandQuery.trim()}”`,
        description: 'Filter the current page',
        icon: FiSearch,
      });
    }

    return pages;
  }, [active, commandQuery, navItems]);

  const groupedNavItems = useMemo(() => {
    const groups: Record<string, typeof navItems> = { club: [], operations: [], content: [], controls: [] };
    navItems.forEach((item) => groups[item.group].push(item));
    return groups;
  }, [navItems]);

  function groupLabelsFor(group: string) {
    return groupLabels[group] ?? group;
  }

  function selectCommand(item: (typeof commandItems)[number]) {
    if (item.kind === 'search') {
      onSearch(commandQuery.trim());
    } else {
      onNavigate(item.id);
      onSearch('');
    }
    setCommandOpen(false);
    setCommandQuery('');
    setCommandIndex(0);
  }

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandQuery('');
        setCommandIndex(0);
        setCommandOpen(true);
      } else if (commandOpen && event.key === 'Escape') {
        setCommandOpen(false);
      }
    }

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [commandOpen]);

  useEffect(() => {
    if (commandOpen) commandInputRef.current?.focus();
  }, [commandOpen]);

  useEffect(() => {
    setCommandIndex((index) => Math.min(index, Math.max(commandItems.length - 1, 0)));
  }, [commandItems.length]);

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <a className="admin-brand" href="/" aria-label="IEC JKUAT public website">
          <img className="admin-brand-mark" src={assetUrl('uploads/iec-mark.png')} alt="IEC JKUAT logo" />
          <span><strong>IEC JKUAT</strong><small>ADMINISTRATION</small></span>
        </a>
        <div className="sidebar-label">Workspace</div>
        <nav className="sidebar-nav" aria-label="Admin sections">
          {Object.entries(groupedNavItems).map(([group, items]) => {
            const isCollapsed = collapsedGroups[group];
            if (!items.length) return null;

            return (
              <div key={group} className={`sidebar-group${isCollapsed ? ' is-collapsed' : ''}`}>
                <button
                  type="button"
                  className="sidebar-group-header"
                  aria-expanded={!isCollapsed}
                  onClick={() => setCollapsedGroups((current) => ({ ...current, [group]: !current[group] }))}
                >
                  <span>{groupLabels[group] ?? group}</span>
                  <FiChevronDown aria-hidden="true" />
                </button>
                {!isCollapsed && items.map(({ id, label, icon: Icon }) => (
                  <button
                    type="button"
                    key={id}
                    className={`sidebar-link${active === id ? ' is-active' : ''}`}
                    aria-current={active === id ? 'page' : undefined}
                    onClick={() => {
                      setProfileOpen(false);
                      setNotificationOpen(false);
                      onNavigate(id);
                    }}
                  >
                    <Icon aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </nav>
      </aside>

      <main className="admin-main">
        <header className="topbar">
          <div className="topbar-mobile-brand"><img className="admin-brand-mark" src={assetUrl('uploads/iec-mark.png')} alt="IEC JKUAT logo" /> Admin</div>
          <div className="topbar-title"><span>Workspace</span><b>/</b><strong>{TITLES[active]}</strong></div>
          <button type="button" className="topbar-search-trigger" onClick={() => setCommandOpen(true)} aria-label="Search pages and records (Ctrl+K)">
            <FiSearch aria-hidden="true" />
            <span>Search pages and records…</span>
            <kbd>Ctrl</kbd><kbd>K</kbd>
          </button>

          <div className="topbar-tools">
            <div className="notification-wrap">
              <button type="button" className="topbar-icon-button" aria-label="Open notifications" onClick={() => { setNotificationOpen((current) => !current); setProfileOpen(false); }}>
                <FiBell aria-hidden="true" />
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </button>
              {notificationOpen && (
                <div className="dropdown-panel notification-panel" role="menu" aria-label="Notifications">
                  <div className="dropdown-header">
                    <strong>Notifications</strong>
                    <button type="button" className="text-button" onClick={onMarkAllRead}>Mark all read</button>
                  </div>
                  <div className="notification-list">
                    {notifications.length ? notifications.map((item) => (
                      <button key={item.id} type="button" className={`notification-item${item.unread ? ' unread' : ''}`} onClick={() => onReadNotification?.(item.id)}>
                        <div className="notification-dot" />
                        <div>
                          <strong>{item.title}</strong>
                          <p>{item.description}</p>
                          <time>{item.time}</time>
                        </div>
                      </button>
                    )) : <p className="dropdown-empty">No notifications.</p>}
                  </div>
                </div>
              )}
            </div>

            <div className="profile-wrap">
              <button type="button" className="profile-trigger" onClick={() => { setProfileOpen((current) => !current); setNotificationOpen(false); }} title={roleLabel} aria-label="Open profile menu">
                <span className="avatar-initial">{initials}</span>
                <span className="profile-copy">
                  <strong>{roleLabel}</strong>
                </span>
                <FiChevronDown aria-hidden="true" />
              </button>
              {profileOpen && (
                <div className="dropdown-panel profile-panel" role="menu" aria-label="Profile menu">
                  <div className="profile-summary">
                    <span className="avatar-initial large">{initials}</span>
                    <div>
                      <strong>{roleLabel}</strong>
                      <span>{email || 'Administrator'}</span>
                    </div>
                  </div>
                  <button type="button" className="dropdown-action" onClick={() => onNavigate('settings')}>
                    <FiSettings aria-hidden="true" />
                    <span>Account settings</span>
                  </button>
                  <button type="button" className="dropdown-action" onClick={() => onNavigate('roles')}>
                    <FiShield aria-hidden="true" />
                    <span>Roles & audit</span>
                  </button>
                  <button type="button" className="dropdown-action" onClick={() => onNavigate('content')}>
                    <FiExternalLink aria-hidden="true" />
                    <span>Content control</span>
                  </button>
                  <button type="button" className="dropdown-action danger" onClick={onSignOut}>
                    <FiLogOut aria-hidden="true" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <button type="button" className="mobile-signout" onClick={onSignOut} aria-label="Sign out">
            <FiLogOut aria-hidden="true" />
          </button>
        </header>

        <nav className="mobile-tabs" aria-label="Admin sections">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              className={active === id ? 'is-active' : ''}
              aria-current={active === id ? 'page' : undefined}
              onClick={() => onNavigate(id)}
            >
              <Icon aria-hidden="true" /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="page-content">{children}</div>
      </main>
      {commandOpen && (
        <div className="command-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setCommandOpen(false);
        }}>
          <section className="command-dialog" role="dialog" aria-modal="true" aria-labelledby="command-title">
            <h2 className="visually-hidden" id="command-title">Search admin pages and records</h2>
            <label className="command-search">
              <FiSearch aria-hidden="true" />
              <input
                ref={commandInputRef}
                value={commandQuery}
                onChange={(event) => {
                  setCommandQuery(event.target.value);
                  setCommandIndex(0);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setCommandIndex((index) => Math.min(index + 1, commandItems.length - 1));
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setCommandIndex((index) => Math.max(index - 1, 0));
                  } else if (event.key === 'Enter' && commandItems[commandIndex]) {
                    event.preventDefault();
                    selectCommand(commandItems[commandIndex]);
                  } else if (event.key === 'Escape') {
                    event.preventDefault();
                    setCommandOpen(false);
                  }
                }}
                placeholder="Search pages, sections, and current records…"
                aria-label="Search pages and current records"
                aria-controls="command-results"
                aria-activedescendant={commandItems[commandIndex] ? `command-result-${commandIndex}` : undefined}
              />
              <button type="button" className="command-close" onClick={() => setCommandOpen(false)} aria-label="Close search"><FiX /></button>
            </label>
            <div className="command-results" id="command-results" role="listbox" aria-label="Search results">
              {commandItems.length ? commandItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    id={`command-result-${index}`}
                    key={`${item.kind}-${item.id}`}
                    className={`command-result${index === commandIndex ? ' is-active' : ''}`}
                    role="option"
                    aria-selected={index === commandIndex}
                    onMouseEnter={() => setCommandIndex(index)}
                    onClick={() => selectCommand(item)}
                  >
                    <span className="command-result-icon"><Icon aria-hidden="true" /></span>
                    <span className="command-result-copy"><strong>{item.label}</strong><small>{item.description}</small></span>
                    {index === commandIndex && <FiCornerDownLeft className="command-enter-icon" aria-hidden="true" />}
                  </button>
                );
              }) : <p className="command-empty">No pages or actions match that search.</p>}
            </div>
            <footer className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span><span><kbd>↵</kbd> to open</span><span><kbd>esc</kbd> to close</span></footer>
          </section>
        </div>
      )}
    </div>
  );
}
