import {
  CalendarDays, ChartNoAxesCombined, CircleHelp, HeartHandshake, Package, Plus, Truck, type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Badge, DonationTable, Empty, PageTitle } from './ui';
import { activeNgoId, donorName, formatDate, getStatus, kg, kgLabel, rolePickupStops, sampleTime, timeLabel, type DemoState, type Role } from './demo';

export type GoTo = (page: string) => void;

export function receiptSeries(state: DemoState, days: number) {
  return Array.from({ length: days }, (_, index) => {
    const dayOffset = index - days + 1;
    const date = sampleTime(dayOffset);
    const start = Date.parse(sampleTime(dayOffset, 0));
    const end = Date.parse(sampleTime(dayOffset + 1, 0));
    const kilograms = state.pickups.reduce((sum, pickup) => {
      if (pickup.status !== 'Received' || !pickup.receivedAt) return sum;
      const received = Date.parse(pickup.receivedAt);
      if (received < start || received >= end) return sum;
      const donation = state.donations.find(({ id }) => id === pickup.donationId);
      return sum + (donation ? kg(donation, pickup.packages) : 0);
    }, 0);
    return { date, kilograms };
  });
}

function ReceiptChart({ state }: { state: DemoState }) {
  const [days, setDays] = useState(7);
  const values = receiptSeries(state, days);
  const total = values.reduce((sum, day) => sum + day.kilograms, 0);
  const peak = Math.max(...values.map(({ kilograms }) => kilograms));
  const max = Math.max(120, Math.ceil(peak / 40) * 40);

  return <section className="panel chart-panel">
    <div className="panel-header">
      <div><h2>Food redistributed</h2><p>Verified NGO receipts over time</p></div>
      <select aria-label="Impact chart period" value={days} onChange={(event) => setDays(Number(event.target.value))}>
        <option value={7}>Last 7 days</option><option value={14}>Last 14 days</option>
      </select>
    </div>
    <div className="chart-total"><strong>{kgLabel(total)} <span>kg</span></strong><span className="chart-key"><i /> Received</span></div>
    <div className="chart" role="img" aria-label={values.map(({ date, kilograms }) =>
      formatDate(date) + ': ' + kgLabel(kilograms) + ' kilograms').join(', ')}>
      <div className="chart-axis" aria-hidden="true">{[max, max * 2 / 3, max / 3, 0].map((tick) => <span key={tick}>{Math.round(tick)}</span>)}</div>
      <div className="chart-content" aria-hidden="true">
        <div className="chart-grid"><i /><i /><i /><i /></div>
        <div className="chart-bars">{values.map(({ date, kilograms }, index) =>
          <div className="chart-day" key={date}>
            <div className="bar-track">
              <div className={'chart-bar' + (kilograms > 0 && kilograms === peak ? ' peak' : '')}
                style={{ height: Math.max(2, (kilograms / max) * 100) + '%' }}
                title={formatDate(date) + ' · ' + kgLabel(kilograms) + ' kg'} />
            </div>
            <span>{days === 7 ? formatDate(date, { weekday: 'short' }) : (index % 2 === 0 ? formatDate(date) : '')}</span>
          </div>)}</div>
      </div>
    </div>
  </section>;
}

export function UpcomingPickups({ state, goTo }: { state: DemoState; goTo: GoTo }) {
  const upcoming = state.pickups.filter((pickup) => pickup.status !== 'Received')
    .sort((a, b) => a.at.localeCompare(b.at)).slice(0, 3);

  return <section className="panel upcoming-panel">
    <div className="panel-header"><div><h2>Upcoming pickups</h2><p>Next collections to coordinate</p></div>
      <button className="text-button" onClick={() => goTo('pickups')}>View all</button>
    </div>
    {upcoming.length ? <div className="pickup-list">{upcoming.map((pickup) => {
      const donation = state.donations.find(({ id }) => id === pickup.donationId);
      return <div className="upcoming-item" key={pickup.id}>
        <div className="date-tile"><span>{formatDate(pickup.at, { month: 'short' })}</span><strong>{formatDate(pickup.at, { day: 'numeric' })}</strong></div>
        <div><strong>{donation?.name ?? 'Donation pickup'}</strong><small>{timeLabel(pickup.at)} · {donation?.area ?? 'Agreed location'}</small>
          <Badge status={pickup.status} /></div>
      </div>;
    })}</div> : <Empty title="No pickups scheduled" description="Approved requests will appear here." />}
  </section>;
}

interface Stat {
  icon: LucideIcon;
  color: string;
  label: string;
  value: number | string;
  text: string;
  page: string;
}

export function StatsCards({ stats, goTo }: { stats: Stat[]; goTo: GoTo }) {
  return <section className={'stats-grid' + (stats.length === 3 ? ' impact-stats' : '')} aria-label="Workspace activity summary">
    {stats.map(({ icon: Icon, color, label, value, text, page }) =>
      <button className="panel stat-card" key={label} onClick={() => goTo(page)}>
        <span className={'icon-tile ' + color}><Icon size={19} aria-hidden="true" /></span>
        <div className="stat-description"><span>{label}</span><strong>{value}</strong><small>{text}</small></div>
      </button>)}
  </section>;
}


export function Overview({ state, userName, goTo, onCreate, onInspect }: {
  state: DemoState; userName: string; goTo: GoTo; onCreate: () => void; onInspect: (id: string) => void;
}) {
  const offers = state.donations.filter((donation) => donation.organization === donorName);
  const pending = state.requests.filter((request) => request.status === 'Pending' && offers.some(({ id }) => id === request.donationId)).length;
  const open = offers.filter((donation) => getStatus(donation, state.pickups) === 'Open').length;
  const scoped = { ...state, pickups: rolePickupStops(state, 'donor').map(({ pickup }) => pickup) };
  const scheduled = scoped.pickups.filter((pickup) => ['Scheduled', 'En route'].includes(pickup.status)).length;
  const received = receiptSeries(scoped, 7).reduce((sum, day) => sum + day.kilograms, 0);
  const stats = [
    { icon: Package, color: 'sage', label: 'Active donations', value: open, text: 'Open for requests', page: 'donations' },
    { icon: HeartHandshake, color: 'sand', label: 'Pending requests', value: pending, text: 'Awaiting your review', page: 'requests' },
    { icon: Truck, color: 'blue', label: 'Pickups scheduled', value: scheduled, text: 'Upcoming or en route', page: 'pickups' },
    { icon: ChartNoAxesCombined, color: 'sage', label: 'Food received', value: kgLabel(received) + ' kg', text: 'Verified in the last 7 days', page: 'impact' },
  ];

  return <>
    <section className="hero">
      <div className="hero-photo" aria-hidden="true" />
      <div className="hero-content">
        <h1>Welcome back, {userName.split(' ')[0]}.</h1>
        <p>Manage your surplus food donations and follow them from pickup to redistribution.</p>
        <button className="button hero-button" onClick={onCreate}><Plus size={18} /> New donation</button>
      </div>
    </section>
    <StatsCards stats={stats} goTo={goTo} />
    <div className="dashboard-grid"><ReceiptChart state={scoped} /><UpcomingPickups state={scoped} goTo={goTo} /></div>
    <section className="panel recent-panel">
      <div className="panel-header"><div><h2>Recent donations</h2><p>Track the status of your latest offers</p></div>
        <button className="button secondary compact" onClick={() => goTo('donations')}>All donations</button>
      </div>
      <DonationTable donations={offers.slice(0, 4)} pickups={state.pickups} onInspect={onInspect} />
    </section>
  </>;
}

export function Impact({ state, role }: { state: DemoState; role: Role }) {
  const scoped = { ...state, pickups: rolePickupStops(state, role).map(({ pickup }) => pickup) };
  const visibleDonationIds = role === 'ngo' ? new Set([
    ...scoped.pickups.map(({ donationId }) => donationId),
    ...state.requests.filter(({ ngoId }) => ngoId === activeNgoId).map(({ donationId }) => donationId),
  ]) : undefined;

  const receipts = scoped.pickups.filter((pickup) => pickup.status === 'Received');
  const receivedKg = receipts.reduce((sum, receipt) => {
    const donation = scoped.donations.find(({ id }) => id === receipt.donationId);
    return sum + (donation ? kg(donation, receipt.packages) : 0);
  }, 0);
  const expired = scoped.donations.filter((donation) => getStatus(donation, state.pickups) === 'Expired'
    && (role !== 'donor' || donation.organization === donorName)
    && (!visibleDonationIds || visibleDonationIds.has(donation.id))).length;
  return <>
    <PageTitle title="Impact" description="Measure verified receipts and follow donation outcomes." />
    <div className="stats-grid impact-stats">
      <div className="panel stat-card"><span className="icon-tile sage"><Package size={19} /></span><div className="stat-description"><span>Verified food received</span><strong>{kgLabel(receivedKg)} kg</strong></div></div>
      <div className="panel stat-card"><span className="icon-tile blue"><HeartHandshake size={19} /></span><div className="stat-description"><span>Confirmed receipts</span><strong>{receipts.length}</strong></div></div>
      <div className="panel stat-card"><span className="icon-tile sand"><CalendarDays size={19} /></span><div className="stat-description"><span>Expired listings</span><strong>{expired}</strong></div></div>
    </div>
    <div className="dashboard-grid"><ReceiptChart state={scoped} />
      <section className="panel info-panel">
        <span className="icon-tile sage"><CircleHelp size={19} /></span><h2>How impact is counted</h2>
        <p>Receipts add the recorded weight of food accepted by an NGO. Waste reduction estimates will use separate donor declarations when available.</p>
      </section>
    </div>
  </>;
}
