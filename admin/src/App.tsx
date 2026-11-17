import { useEffect, useMemo, useRef, useState } from 'react';
import { sileo, Toaster } from 'sileo';
import Layout from './components/Layout';
import Login from './pages/Login';
import Management from './pages/Management';
import Overview from './pages/Overview';
import { adminApi } from './lib/api';
import { getSupabase, isSupabaseConfigured } from './lib/supabase';
import Notice from './components/Notice';
import type { AdminProfile, AdminView, DashboardData } from './types';
import { canAccessAdminView } from './types';

interface AppNotification {
  id: string;
  title: string;
  description: string;
  unread: boolean;
  time: string;
}

const EMPTY_DASHBOARD: DashboardData = {
  members: 0,
  activeMembers: 0,
  completedPayments: 0,
  projects: 0,
  publishedProjects: 0,
  collectedLastSixMonths: 0,
  monthly: [],
};

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [activeView, setActiveView] = useState<AdminView>('overview');
  const [search, setSearch] = useState('');
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState<AppNotification[]>([
    { id: 'welcome', title: 'Admin workspace ready', description: 'Internal operations and member updates are available.', unread: false, time: 'just now' },
  ]);
  const wasAuthenticated = useRef(false);
  const authHydrated = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const client = getSupabase();
        const { data: { session }, error: sessionError } = await client.auth.getSession();
        if (sessionError) throw sessionError;
        if (!cancelled) {
          setIsAuthenticated(Boolean(session));
          setEmail(session?.user?.email ?? '');
          authHydrated.current = true;
        }
      } catch (loadError) {
        if (!cancelled) {
          setIsAuthenticated(false);
          authHydrated.current = true;
          setError(loadError instanceof Error ? loadError.message : 'Unable to load the admin workspace.');
        }
      } finally {
        if (!cancelled) setIsReady(true);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authHydrated.current) {
      wasAuthenticated.current = isAuthenticated;
      return;
    }
    if (isAuthenticated && !wasAuthenticated.current) {
      setNotifications((current) => [{
        id: `n-${Date.now()}`,
        title: 'Signed in',
        description: 'You are now active in the IEC admin portal.',
        unread: false,
        time: 'just now',
      }, ...current].slice(0, 8));
      sileo.success({
        title: 'Welcome back',
        description: 'You are now signed in to the IEC admin portal.',
        duration: 2600,
      });
    }
    wasAuthenticated.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setAdminProfile(null);
      setProfileLoading(false);
      setDashboardData(null);
      return undefined;
    }

    let cancelled = false;
    setProfileLoading(true);

    void (async () => {
      try {
        const response = await adminApi.currentAdmin();
        if (!cancelled) {
          setAdminProfile(response);
          setError('');
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load the administrator profile.');
          setAdminProfile(null);
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !adminProfile || adminProfile.role === 'editor') {
      setDashboardData(null);
      return undefined;
    }

    let cancelled = false;
    void (async () => {
      try {
        setDashboardData(await adminApi.dashboard());
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Dashboard is unavailable.');
          setDashboardData(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, adminProfile]);

  useEffect(() => {
    if (!adminProfile) return;
    if (!canAccessAdminView(adminProfile.role, activeView)) {
      setActiveView('overview');
    }
  }, [activeView, adminProfile]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError('Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to admin/.env.local.');
      setIsReady(true);
      return;
    }
    const client = getSupabase();
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session));
      setEmail(session?.user?.email ?? '');
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const currentDashboard = useMemo(() => dashboardData ?? EMPTY_DASHBOARD, [dashboardData]);

  function navigate(view: AdminView) {
    if (!adminProfile) return;
    if (!canAccessAdminView(adminProfile.role, view)) return;
    setActiveView(view);
    setSearch('');
  }

  async function handleSignOut() {
    try {
      const client = getSupabase();
      await client.auth.signOut();
      setNotifications((current) => [{
        id: `n-${Date.now()}`,
        title: 'Signed out',
        description: 'Your session has ended and the admin portal is locked.',
        unread: false,
        time: 'just now',
      }, ...current].slice(0, 8));
      sileo.info({
        title: 'Signed out',
        description: 'You have been signed out of the IEC admin portal.',
        duration: 2800,
      });
    } catch (signOutError) {
      sileo.error({
        title: 'Sign-out failed',
        description: signOutError instanceof Error ? signOutError.message : 'Sign-out failed.',
      });
      setError(signOutError instanceof Error ? signOutError.message : 'Sign-out failed.');
      return;
    }
    setIsAuthenticated(false);
    setEmail('');
  }

  if (!isReady) {
    return (
      <>
        <Toaster position="top-right" theme="light" />
        <div className="loading-screen">Loading admin workspace…</div>
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-right" theme="light" />
        <Login error={error} onError={setError} />
      </>
    );
  }
  if (profileLoading) {
    return (
      <>
        <Toaster position="top-right" theme="light" />
        <div className="loading-screen">Loading administrator profile…</div>
      </>
    );
  }
  if (!adminProfile) {
    return (
      <>
        <Toaster position="top-right" theme="light" />
        <div className="loading-screen"><div className="profile-error">
          <Notice>{error || 'The administrator profile could not be loaded.'}</Notice>
          <button type="button" className="button-secondary" onClick={() => void handleSignOut()}>Sign out</button>
        </div></div>
      </>
    );
  }

  const renderView = () => {
    if (activeView === 'overview') return <Overview data={currentDashboard} />;
    return <Management view={activeView} profile={adminProfile} search={search} onNavigate={navigate} />;
  };

  return (
    <>
      <Toaster position="top-right" theme="light" />
      <Layout
        active={activeView}
        email={email}
        role={adminProfile.role}
        onSearch={setSearch}
        onNavigate={navigate}
        onSignOut={handleSignOut}
        notifications={notifications}
        onMarkAllRead={() => setNotifications((current) => current.map((item) => ({ ...item, unread: false })))}
        onReadNotification={(id) => setNotifications((current) => current.map((item) => item.id === id ? { ...item, unread: false } : item))}
      >
        {error && <Notice>{error}</Notice>}
        {renderView()}
      </Layout>
    </>
  );
}
