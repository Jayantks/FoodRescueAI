import { useEffect, useState } from 'react';
import {
  Bell, Boxes, ChartNoAxesCombined, ClipboardList, HandHeart, History, LayoutDashboard, LogOut,
  Menu, Package, Search, ShieldCheck, Sparkles, Truck, Users, X, type LucideIcon,
} from 'lucide-react';
import {
  activeNgoId, createDemoState, donorName, formatDate, getStatus, id, nextPickupStatus, rolePickupStops,
  type Demand, type DemoState, type Donation, type PickupStatus, type Role,
} from './demo';
import { restoreSession, roleLabels, signOut, type AuthUser, type Session } from './auth';
import { CreateDonation, DonationDetails } from './dialogs';
import { Brand, Login } from './Login';
import { Impact, Overview } from './overview';
import { RoleOverview } from './role-overview';
import { DemandView, Donations, Matches, NgoCapacity, NgoNetwork, Partners, Pickups, Requests, requestProblem } from './views';

interface NavigationItem { id: string; label: string; icon: LucideIcon }

const home: NavigationItem = { id: 'overview', label: 'Overview', icon: LayoutDashboard };

const navigation: Record<Role, NavigationItem[]> = {
  donor: [
    home,
    { id: 'donations', label: 'My donations', icon: Package },
    { id: 'requests', label: 'Allocation requests', icon: ClipboardList },
    { id: 'matches', label: 'AI recommendations', icon: Sparkles },
    { id: 'network', label: 'NGO network', icon: Users },
    { id: 'pickups', label: 'Pickup tracking', icon: Truck },
    { id: 'impact', label: 'Impact report', icon: ChartNoAxesCombined },
  ],
  ngo: [
    home,
    { id: 'donations', label: 'Find donations', icon: Search },
    { id: 'requests', label: 'Allocation requests', icon: ClipboardList },
    { id: 'demand', label: 'My demand', icon: HandHeart },
    { id: 'capacity', label: 'Capacity', icon: Boxes },
    { id: 'pickups', label: 'Incoming pickups', icon: Truck },
    { id: 'impact', label: 'Impact report', icon: ChartNoAxesCombined },
  ],
  volunteer: [
    home,
    { id: 'pickups', label: 'Assigned pickups', icon: Truck },
    { id: 'history', label: 'Handover history', icon: History },
  ],
  admin: [
    home,
    { id: 'partners', label: 'Organisations', icon: ShieldCheck },
    { id: 'donations', label: 'Donations', icon: Package },
    { id: 'requests', label: 'Allocation monitor', icon: ClipboardList },
    { id: 'pickups', label: 'Pickup tracking', icon: Truck },
    { id: 'impact', label: 'Impact analytics', icon: ChartNoAxesCombined },
  ],
};

const storageKey = 'foodbridge-demo-v1';

function readState(): DemoState {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (parsed && ['donations', 'requests', 'pickups', 'partners', 'demand'].every((key) => Array.isArray(parsed[key]))) return parsed;
  } catch {
    // Fall back to fresh fixtures if browser storage is unavailable.
  }
  return createDemoState();
}

function currentRoute() {
  return window.location.hash.slice(1);
}

function replaceRoute(page: string) {
  window.history.replaceState(null, '', '#' + page);
}

export function App() {
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadSession() {
      try {
        const restored = await restoreSession(AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]));
        if (controller.signal.aborted) return;
        setSession(restored);
        if (!restored) replaceRoute('login');
      } catch {
        if (controller.signal.aborted) return;
        replaceRoute('login');
        setMessage('The sign-in service is unavailable. Please try again.');
      } finally {
        if (!controller.signal.aborted) setChecking(false);
      }
    }

    void loadSession();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    const { user: previousUser, expiresAt } = session;

    function endSession() {
      replaceRoute('login');
      setSession(null);
      setMessage('Your session has ended. Sign in to continue.');
    }

    async function recheck() {
      try {
        const current = await restoreSession(controller.signal);
        if (controller.signal.aborted) return;
        if (!current) endSession();
        else if (current.user.id !== previousUser.id || current.expiresAt !== expiresAt) {
          if (current.user.id !== previousUser.id) replaceRoute('overview');
          setSession(current);
        }
      } catch {
        // A temporary connection error does not end an existing session.
      }
    }

    const expiryTimer = window.setTimeout(endSession, Math.max(0, expiresAt - Date.now()));
    window.addEventListener('focus', recheck);
    return () => {
      controller.abort();
      window.clearTimeout(expiryTimer);
      window.removeEventListener('focus', recheck);
    };
  }, [session]);

  if (checking) return <main className="session-loading" role="status">Opening FoodRescue AI…</main>;
  if (!session) return <Login message={message} onSignIn={(next) => {
    replaceRoute('overview');
    setMessage('');
    setSession(next);
  }} />;
  return <Workspace key={session.user.id} user={session.user} onSignOut={async () => {
    await signOut();
    replaceRoute('login');
    setMessage('');
    setSession(null);
  }} />;
}

function Workspace({ user, onSignOut }: { user: AuthUser; onSignOut: () => Promise<void> }) {
  const [state, setState] = useState(readState);
  const role = user.role;
  const [route, setRoute] = useState(currentRoute);
  const [drawer, setDrawer] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [creating, setCreating] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [inspect, setInspect] = useState('');
  const [matchSelection, setMatchSelection] = useState('');
  const [notice, setNotice] = useState({ text: '', kind: '' });

  const initials = user.name.split(' ').slice(0, 2).map((part) => part.charAt(0)).join('');
  const menu = navigation[role];
  const current = menu.find((item) => item.id === route) ?? menu[0];
  const picked = state.donations.find(({ id }) => id === inspect);
  const pending = role === 'donor' ? state.requests.filter((request) => request.status === 'Pending'
    && state.donations.some(({ id, organization }) => id === request.donationId && organization === donorName)).length : 0;

  useEffect(() => {
    const update = () => { setRoute(currentRoute()); setDrawer(false); setNotifications(false); };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* Changes stay in memory. */ }
  }, [state]);

  useEffect(() => {
    if (!notice.text) return;
    const timer = window.setTimeout(() => setNotice({ text: '', kind: '' }), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (route !== current.id) {
      replaceRoute(current.id);
      setRoute(current.id);
    }
    window.scrollTo(0, 0);
  }, [current.id, route]);

  function announce(text: string, kind = 'success') {
    setNotice({ text, kind });
  }

  function goTo(page: string) {
    setRoute(page);
    setDrawer(false);
    setNotifications(false);
    if (currentRoute() !== page) window.location.hash = page;
  }

  async function leaveWorkspace() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await onSignOut();
    } catch {
      announce('Sign out failed. Please try again.', 'error');
      setSigningOut(false);
    }
  }

  function addDonation(donation: Donation) {
    if (role !== 'donor') return;
    setState((previous) => ({ ...previous, donations: [donation, ...previous.donations] }));
    setCreating(false);
    announce('Donation published.');
  }

  function addRequest(packages: number) {
    if (!picked || role !== 'ngo' || !Number.isInteger(packages) || packages < 1) return;
    const request = { id: id(), donationId: picked.id, ngoId: activeNgoId, packages, status: 'Pending' as const };
    const problem = requestProblem(picked, state, request);
    if (problem) { announce(problem, 'error'); return; }
    if (state.requests.some((item) => item.donationId === picked.id && item.ngoId === activeNgoId && item.status === 'Pending')) return;
    setState((previous) => ({ ...previous, requests: [request, ...previous.requests] }));
    setInspect('');
    announce('Request sent to the donor.');
  }

  function decideRequest(requestId: string, status: 'Approved' | 'Declined') {
    const request = state.requests.find((item) => item.id === requestId && item.status === 'Pending');
    const donation = state.donations.find((item) => item.id === request?.donationId && item.organization === donorName);
    if (role !== 'donor' || !request || !donation) return;
    const problem = status === 'Approved' ? requestProblem(donation, state, request) : '';
    if (problem) { announce(problem, 'error'); return; }
    const pickup = { id: id(), donationId: donation.id, ngoId: request.ngoId, packages: request.packages,
      at: donation.pickupAt, status: 'Awaiting assignment' as const };
    setState((previous) => ({
      ...previous,
      requests: previous.requests.map((item) => item.id === requestId ? { ...item, status } : item),
      pickups: status === 'Approved' ? [pickup, ...previous.pickups] : previous.pickups,
    }));
    announce(status === 'Approved' ? 'Request approved. Packages reserved.' : 'Request declined.');
  }

  function updatePickup(pickupId: string, status: PickupStatus) {
    const stop = rolePickupStops(state, role).find(({ pickup }) => pickup.id === pickupId);
    if (!stop || nextPickupStatus(role, stop.pickup) !== status) return;
    const { donation } = stop;
    if (Date.parse(donation.cutoffAt) <= Date.now() || donation.held) {
      announce('This pickup requires review because the offer is expired or on hold.', 'error');
      return;
    }
    setState((previous) => ({
      ...previous,
      pickups: previous.pickups.map((item) => item.id === pickupId
        ? { ...item, status, receivedAt: status === 'Received' ? new Date().toISOString() : undefined } : item),
    }));
    announce('Demo pickup updated to ' + status.toLowerCase() + '.');
  }

  function assignPickup(pickupId: string, collector: string) {
    if (role !== 'admin' && role !== 'ngo') return;
    const stop = rolePickupStops(state, role).find(({ pickup }) => pickup.id === pickupId && pickup.status === 'Awaiting assignment');
    if (!stop) return;
    const { donation } = stop;
    if (Date.parse(donation.cutoffAt) <= Date.now() || donation.held) {
      announce('This pickup requires review because the offer is expired or on hold.', 'error');
      return;
    }
    setState((previous) => ({
      ...previous,
      pickups: previous.pickups.map((item) => item.id === pickupId ? { ...item, collector, status: 'Scheduled' } : item),
    }));
    announce(collector === 'NGO self-collection' ? 'NGO self-collection scheduled.' : 'Demo volunteer assigned.');
  }

  function saveDemand(entry: Demand) {
    if (role !== 'ngo') return;
    setState((previous) => ({ ...previous, demand: [entry, ...previous.demand.filter((item) => item.category !== entry.category)] }));
    announce('Food need saved.');
  }

  function verifyPartner(partnerId: string) {
    if (role !== 'admin') return;
    setState((previous) => ({
      ...previous, partners: previous.partners.map((partner) => partner.id === partnerId ? { ...partner, verified: true } : partner),
    }));
    announce('Demo partner verified.');
  }

  function showMatches() {
    if (!picked) return;
    setMatchSelection(picked.id);
    setInspect('');
    goTo('matches');
  }

  const dueSoon = role === 'donor' ? state.donations.filter((donation) => donation.organization === donorName
    && ['Open', 'In pickup'].includes(getStatus(donation, state.pickups))
    && Date.parse(donation.cutoffAt) - Date.now() < 86_400_000).length : 0;

  return <div className="app-shell">
    <a className="skip-link" href="#main-content" onClick={(event) => {
      event.preventDefault();
      document.getElementById('main-content')?.focus();
    }}>Skip to content</a>
    {drawer && <button className="drawer-scrim" aria-label="Close navigation" onClick={() => setDrawer(false)} />}
    <aside className={'sidebar' + (drawer ? ' expanded' : '')} id="sidebar">
      <div className="sidebar-top">
        <button className="brand" onClick={() => goTo(menu[0].id)}>
          <Brand />
        </button>
        <span className="nav-caption">{roleLabels[role]} workspace</span>
        <nav aria-label="Workspace navigation">
          {menu.map(({ id, label, icon: Icon }) => <button
            key={id} className={'nav-item' + (current.id === id ? ' active' : '')}
            aria-current={current.id === id ? 'page' : undefined}
            onClick={() => { if (id === 'matches') setMatchSelection(''); goTo(id); }}
          >
            <Icon size={19} strokeWidth={1.85} aria-hidden="true" />{label}
            {id === 'requests' && pending > 0 && <span className="nav-count">{pending}</span>}
          </button>)}
        </nav>
      </div>
      <div className="profile">
        <span aria-hidden="true" className="avatar">{initials}</span>
        <div><strong>{user.name}</strong><small>{user.organization}</small></div>
      </div>
    </aside>
    <div className="app-body">
      <header className="topbar">
        <div className="breadcrumb">
          <button className="icon-button mobile-menu" aria-label="Open navigation" aria-expanded={drawer} aria-controls="sidebar"
            onClick={() => setDrawer(!drawer)}>{drawer ? <X size={22} /> : <Menu size={22} />}</button>
          <span className="crumb-parent">Workspace</span><span aria-hidden="true" className="crumb-divider">/</span><strong>{current.label}</strong>
        </div>
        <div className="top-actions">
          <span className="demo-tag"><i /> Demo</span>
          <span className="current-role">{roleLabels[role]}</span>
          <button className="button secondary compact sign-out" onClick={leaveWorkspace} disabled={signingOut} aria-label="Sign out">
            <LogOut size={17} aria-hidden="true" /><span>Sign out</span>
          </button>
          <div className="notifications">
            <button className="icon-button notice-button" aria-label="Notifications" aria-expanded={notifications}
              onClick={() => setNotifications(!notifications)}>
              <Bell size={20} strokeWidth={1.8} />
              {(pending > 0 || dueSoon > 0) && <i />}
            </button>
            {notifications && <section className="panel notification-panel" aria-label="Notifications">
              <h2>Notifications</h2>
              {!pending && !dueSoon && <p>You’re all caught up.</p>}
              {!!pending && <button className="notification-item" onClick={() => goTo('requests')}>
                <ClipboardList size={18} /><span>{pending} {pending === 1 ? 'request needs' : 'requests need'} your review.</span>
              </button>}
              {!!dueSoon && <button className="notification-item" onClick={() => goTo('donations')}>
                <Package size={18} /><span>{dueSoon} {dueSoon === 1 ? 'offer reaches its cutoff' : 'offers reach their cutoff'} within 24 hours.</span>
              </button>}
            </section>}
          </div>
        </div>
      </header>
      <main id="main-content" className="workspace" tabIndex={-1}>
        {current.id === 'overview' && (role === 'donor' ? <>
          <div className="overview-heading"><h2>Donor dashboard</h2><span>{formatDate(new Date().toISOString(), { weekday: 'long', month: 'short', day: 'numeric' })}</span></div>
          <Overview state={state} userName={user.name} goTo={(page) => { if (page === 'matches') setMatchSelection(''); goTo(page); }}
            onCreate={() => setCreating(true)} onInspect={setInspect} />
        </> : <RoleOverview user={user} state={state} goTo={goTo} />)}
        {current.id === 'donations' && <Donations key={role} state={state} role={role} onCreate={() => setCreating(true)} onInspect={setInspect} />}
        {current.id === 'requests' && <Requests key={role} state={state} role={role} onDecide={decideRequest} openPickup={() => goTo('pickups')} />}
        {current.id === 'matches' && <Matches key={matchSelection} state={state} initialSelection={matchSelection} onInspect={setInspect} />}
        {(current.id === 'pickups' || current.id === 'history') && <Pickups key={current.id} state={state} role={role}
          historyOnly={current.id === 'history'} onStatus={updatePickup} onAssign={assignPickup} />}
        {current.id === 'network' && <NgoNetwork state={state} />}
        {current.id === 'capacity' && <NgoCapacity state={state} />}
        {current.id === 'impact' && <Impact state={state} role={role} />}
        {current.id === 'demand' && <DemandView state={state} save={saveDemand} />}
        {current.id === 'partners' && <Partners state={state} onVerify={verifyPartner} />}
      </main>
    </div>
    {creating && <CreateDonation save={addDonation} onClose={() => setCreating(false)} />}
    {picked && <DonationDetails donation={picked} state={state} role={role} onClose={() => setInspect('')}
      request={addRequest} setHold={(held) => {
        if (role !== 'admin') return;
        setState((previous) => ({
          ...previous, donations: previous.donations.map((donation) => donation.id === picked.id ? { ...donation, held } : donation),
        }));
        setInspect('');
        announce(held ? 'Donation placed on hold.' : 'Donation hold lifted.');
      }} showMatches={showMatches} />}
    <div className="toast-region" aria-live="polite">
      {notice.text && <div className={'toast ' + notice.kind}>{notice.text}</div>}
    </div>
  </div>;
}
