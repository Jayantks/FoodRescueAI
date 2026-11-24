import {
  ChartNoAxesCombined, ClipboardList, HandHeart, HeartHandshake, Package, ShieldCheck, Truck,
} from 'lucide-react';
import { type AuthUser } from './auth';
import {
  activeNgoId, formatDate, getStatus, kgLabel, rolePickupStops, timeLabel, type DemoState,
} from './demo';
import { type GoTo, StatsCards, UpcomingPickups } from './overview';
import { Badge, CategoryIcon, Empty, PageTitle } from './ui';

export function RoleOverview({ user, state, goTo }: { user: AuthUser; state: DemoState; goTo: GoTo }) {
  const pickups = rolePickupStops(state, user.role).map(({ pickup }) => pickup);
  const viewState = { ...state, pickups };
  const active = pickups.filter(({ status }) => status !== 'Received').length;
  const received = pickups.filter(({ status }) => status === 'Received').length;
  const firstName = user.name.split(' ')[0];

  if (user.role === 'ngo') {
    const pending = state.requests.filter(({ ngoId, status }) => ngoId === activeNgoId && status === 'Pending').length;
    const needs = state.demand.filter(({ neededBy }) => Date.parse(neededBy) > Date.now());
    return <>
      <PageTitle title="NGO dashboard" description={'Welcome, ' + firstName + '. Manage food needs, requests, and deliveries for ' + user.organization + '.'}
        action={<button className="button primary" onClick={() => goTo('donations')}><Package size={18} />Find donations</button>} />
      <StatsCards stats={[
        { icon: HandHeart, color: 'sage', label: 'Current needs', value: needs.length, text: 'Categories with demand', page: 'demand' },
        { icon: ClipboardList, color: 'sand', label: 'Pending requests', value: pending, text: 'Awaiting donor approval', page: 'requests' },
        { icon: Truck, color: 'blue', label: 'Incoming pickups', value: active, text: 'Awaiting handover', page: 'pickups' },
        { icon: ChartNoAxesCombined, color: 'sage', label: 'Confirmed receipts', value: received, text: 'Received by your NGO', page: 'impact' },
      ]} goTo={goTo} />
      <div className="dashboard-grid">
        <section className="panel list-panel">
          <div className="panel-header"><div><h2>Current needs</h2><p>Declared food demand</p></div>
            <button className="text-button" onClick={() => goTo('demand')}>Manage demand</button></div>
          {needs.length ? needs.slice(0, 4).map(({ category, kilograms, neededBy }) => <div className="list-row" key={category}>
            <CategoryIcon category={category} />
            <div className="list-main"><h3>{category}</h3><p>Needed by {formatDate(neededBy)} · {timeLabel(neededBy)}</p></div>
            <strong>{kgLabel(kilograms)} kg</strong>
          </div>) : <Empty title="No current needs" description="Add the quantity and date your NGO needs food." />}
        </section>
        <UpcomingPickups state={viewState} goTo={goTo} />
      </div>
    </>;
  }

  if (user.role === 'volunteer') {
    const history = rolePickupStops(state, user.role).filter(({ pickup }) => pickup.status === 'Received')
      .sort((a, b) => b.pickup.at.localeCompare(a.pickup.at));
    return <>
      <PageTitle title="Volunteer dashboard" description={'Welcome, ' + firstName + '. Review your assigned pickups and confirmed handovers.'}
        action={<button className="button primary" onClick={() => goTo('pickups')}><Truck size={18} />Assigned pickups</button>} />
      <StatsCards stats={[
        { icon: Truck, color: 'blue', label: 'Active assignments', value: active, text: 'Pickups assigned to you', page: 'pickups' },
        { icon: Package, color: 'sand', label: 'In progress', value: pickups.filter(({ status }) => ['En route', 'Collected'].includes(status)).length, text: 'On the way or collected', page: 'pickups' },
        { icon: HeartHandshake, color: 'sage', label: 'Confirmed handovers', value: received, text: 'Received by the NGO', page: 'history' },
      ]} goTo={goTo} />
      <div className="dashboard-grid">
        <UpcomingPickups state={viewState} goTo={goTo} />
        <section className="panel list-panel">
          <div className="panel-header"><div><h2>Recent handovers</h2><p>Receipts confirmed by the NGO</p></div>
            <button className="text-button" onClick={() => goTo('history')}>View history</button></div>
          {history.length ? history.slice(0, 3).map(({ donation, pickup }) => <div className="list-row" key={pickup.id}>
            <CategoryIcon category={donation.category} /><div className="list-main"><h3>{donation.name}</h3>
              <p>{formatDate(pickup.receivedAt ?? pickup.at)} · {pickup.packages} packs</p></div>
          </div>) : <Empty title="No handovers yet" description="Completed pickups will appear here after the NGO records receipt." />}
        </section>
      </div>
    </>;
  }

  const pending = state.partners.filter(({ verified }) => !verified);
  return <>
    <PageTitle title="Administrator dashboard" description={'Welcome, ' + firstName + '. Review organisations and monitor allocations and pickups across the network.'}
      action={<button className="button primary" onClick={() => goTo('partners')}><ShieldCheck size={18} />Review organisations</button>} />
    <StatsCards stats={[
      { icon: ShieldCheck, color: 'sand', label: 'Awaiting verification', value: pending.length, text: 'NGO applications to review', page: 'partners' },
      { icon: Package, color: 'sage', label: 'Open donations', value: state.donations.filter((donation) => getStatus(donation, state.pickups) === 'Open').length, text: 'Available in the network', page: 'donations' },
      { icon: ClipboardList, color: 'blue', label: 'Pending allocations', value: state.requests.filter(({ status }) => status === 'Pending').length, text: 'Requests awaiting a decision', page: 'requests' },
      { icon: ChartNoAxesCombined, color: 'sage', label: 'Confirmed receipts', value: received, text: 'Across all NGOs', page: 'impact' },
    ]} goTo={goTo} />
    <div className="dashboard-grid">
      <section className="panel list-panel">
        <div className="panel-header"><div><h2>Verification queue</h2><p>NGOs awaiting review</p></div>
          <button className="text-button" onClick={() => goTo('partners')}>View queue</button></div>
        {pending.length ? pending.slice(0, 4).map((partner) => <div className="list-row" key={partner.id}>
          <span className="icon-tile sage"><ShieldCheck size={19} /></span>
          <div className="list-main"><h3>{partner.name}</h3><p>{partner.area}</p></div><Badge status="Pending review" />
        </div>) : <Empty title="No pending reviews" description="New NGO applications will appear here." />}
      </section>
      <UpcomingPickups state={viewState} goTo={goTo} />
    </div>
  </>;
}
