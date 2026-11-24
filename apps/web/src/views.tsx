import { lazy, Suspense, useMemo, useState, type FormEvent } from 'react';
import {
  CalendarDays, Clock3, HeartHandshake, List, Map as MapIcon, MapPin, Plus, Search, ShieldCheck, Sparkles, Truck,
} from 'lucide-react';
import {
  activeNgoId, categories, collectorName, donorName, formatDate, getAvailable, getStatus, kg,
  kgLabel, matchesFor, nextPickupStatus, rolePickupStops, timeLabel, type Category, type Demand, type DemoState,
  type Donation, type DonationRequest, type PickupStatus, type PickupStop, type Role,
} from './demo';
import { Badge, CategoryIcon, DonationTable, Empty, OfferCard, PageTitle } from './ui';

const PickupMap = lazy(() => import('./pickup-map/PickupMap'));

export function Donations({ state, role, onCreate, onInspect }: {
  state: DemoState; role: Role; onCreate: () => void; onInspect: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const discovery = role === 'ngo';
  const allowed = state.donations.filter((donation) => {
    if (role === 'donor') return donation.organization === donorName;
    if (discovery) return getStatus(donation, state.pickups) === 'Open'
      && state.partners.some((partner) => partner.id === activeNgoId && partner.verified && partner.categories.includes(donation.category));
    return true;
  });
  const filtered = allowed.filter((donation) => {
    const searchable = [donation.name, donation.category, donation.area, donation.organization].join(' ').toLowerCase();
    const selection = discovery ? donation.category : getStatus(donation, state.pickups);
    return searchable.includes(query.trim().toLowerCase()) && (filter === 'All' || selection === filter);
  });
  return <>
    <PageTitle title={discovery ? 'Find donations' : 'Donations'} description={discovery
      ? 'Find available food that your organization can receive.'
      : 'View offers, available quantities, and pickup status.'}
      action={role === 'donor' && <button className="button primary" onClick={onCreate}><Plus size={18} /> New donation</button>} />
    <div className="filter-row">
      <label className="search-field"><Search size={18} /><input placeholder="Search donations" value={query}
        onChange={(event) => setQuery(event.target.value)} aria-label="Search donations" /></label>
      <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label={discovery ? 'Filter by category' : 'Filter by status'}>
        <option value="All">{discovery ? 'All categories' : 'All statuses'}</option>
        {(discovery ? categories : ['Open', 'In pickup', 'Completed', 'Expired', 'On hold']).map((item) =>
          <option key={item}>{item}</option>)}
      </select>
    </div>
    {discovery && filtered.length
      ? <div className="cards-grid">{filtered.map((donation) => <OfferCard key={donation.id} donation={donation}
        pickups={state.pickups} onInspect={onInspect} />)}</div>
      : <section className="panel"><DonationTable donations={filtered} pickups={state.pickups} onInspect={onInspect} /></section>}
  </>;
}

export function Requests({ state, role, onDecide, openPickup }: {
  state: DemoState; role: Role; onDecide: (id: string, status: 'Approved' | 'Declined') => void; openPickup: () => void;
}) {
  const [filter, setFilter] = useState('All');
  const requests = state.requests.flatMap((request) => {
    const donation = state.donations.find(({ id }) => id === request.donationId);
    const partner = state.partners.find(({ id }) => id === request.ngoId);
    if (!donation || !partner) return [];
    if (role === 'ngo' && request.ngoId !== activeNgoId) return [];
    if (role === 'donor' && donation.organization !== donorName) return [];
    if (filter !== 'All' && request.status !== filter) return [];
    return [{ request, donation, partner }];
  });
  return <>
    <PageTitle title={role === 'admin' ? 'Allocation monitor' : 'Allocation requests'} description={role === 'ngo'
      ? 'Track the offers your organisation has requested.'
      : role === 'admin' ? 'Monitor donation requests and approvals across the network.' : 'Review requests and reserve stock for verified NGOs.'} />
    <div className="filter-row"><select aria-label="Filter requests by status" value={filter} onChange={(event) => setFilter(event.target.value)}>
      {['All', 'Pending', 'Approved', 'Declined'].map((option) => <option value={option} key={option}>{option === 'All' ? 'All statuses' : option}</option>)}
    </select></div>
    <section className="panel list-panel">
      {requests.length ? requests.map(({ request, donation, partner }) => <article className="list-row" key={request.id}>
        <CategoryIcon category={donation.category} />
        <div className="list-main"><h3>{donation.name}</h3><p>{role === 'ngo' ? donation.organization : role === 'admin' ? donation.organization + ' · ' + partner.name : partner.name} · {request.packages} packs · {kgLabel(kg(donation, request.packages))} kg</p></div>
        <div className="row-actions">
          <Badge status={request.status} />
          {role === 'donor' && request.status === 'Pending' && <>
            <button className="button secondary compact" onClick={() => onDecide(request.id, 'Declined')}>Decline</button>
            <button className="button primary compact" onClick={() => onDecide(request.id, 'Approved')}>Approve</button>
          </>}
          {request.status === 'Approved' && <button className="button secondary compact" onClick={openPickup}>View pickups</button>}
        </div>
      </article>) : <Empty title="No requests here" description="New requests appear when an NGO responds to an available offer." />}
    </section>
  </>;
}

export function Matches({ state, initialSelection, onInspect }: { state: DemoState; initialSelection: string; onInspect: (id: string) => void }) {
  const [selected, setSelected] = useState(initialSelection);
  const available = state.donations.filter((donation) => donation.organization === donorName
    && getStatus(donation, state.pickups) === 'Open');
  const donation = available.find(({ id }) => id === selected) ?? available[0];
  const matches = donation ? matchesFor(donation, state) : [];
  return <>
    <PageTitle title="NGO matches" description="Compare nearby organizations by capacity, urgency, and estimated travel time." />
    {!donation ? <section className="panel"><Empty title="No open offers" description="Publish a donation to look for suitable organizations." /></section>
      : <>
        <section className="panel matching-selector">
          <span className="icon-tile sage"><Sparkles size={20} /></span>
          <label>Donation to match
            <select value={donation.id} onChange={(event) => setSelected(event.target.value)}>
              {available.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <button className="button secondary" onClick={() => onInspect(donation.id)}>View donation</button>
        </section>
        {matches.length ? <div className="cards-grid">{matches.map(({ score, allocatablePackages, travelMinutes, partner }, index) =>
          <article className="panel offer-card match-card" key={partner.id}>
            <div className="card-top"><span className="icon-tile sage"><HeartHandshake size={20} /></span>
              <span className="score-pill">{Math.round(score * 100)}/100 fit</span></div>
            <h3>{partner.name}</h3><p>{index === 0 ? 'Highest-ranked eligible NGO' : partner.area}</p>
            <dl className="detail-grid match-facts">
              <div><dt>Can accept</dt><dd>{allocatablePackages} packs</dd></div>
              <div><dt>Estimated trip</dt><dd>{travelMinutes} min</dd></div>
              <div><dt>Distance</dt><dd>{partner.distanceKm} km</dd></div>
              <div><dt>Food needed in</dt><dd>{partner.hoursUntilNeeded} hrs</dd></div>
            </dl>
          </article>)}</div> : <section className="panel"><Empty title="No eligible matches" description="Check the pickup window or consider a smaller offer." /></section>}
        <p className="helper match-note">Fit score weights available capacity at 45%, demand urgency at 35%, and trip time at 20%. Travel estimates use demo data.</p>
      </>}
  </>;
}

const pickupActionLabels: Partial<Record<PickupStatus, string>> = {
  'En route': 'Start pickup',
  Collected: 'Record collection',
  Received: 'Record receipt',
};

function PickupCard({ pickup, donation, state, role, onStatus, onAssign }: PickupStop & {
  state: DemoState; role: Role; onStatus: (id: string, status: PickupStatus) => void;
  onAssign: (id: string, collector: string) => void;
}) {
  const partner = state.partners.find(({ id }) => id === pickup.ngoId);
  const next = nextPickupStatus(role, pickup);

  return <article className="panel offer-card pickup-card">
    <div className="card-top"><span className="icon-tile blue"><Truck size={19} /></span><Badge status={pickup.status} /></div>
    <h3>{donation.name}</h3><p>{partner?.name ?? 'Receiving NGO'} · {pickup.packages} packs</p>
    <div className="card-facts">
      <span><CalendarDays size={16} />{formatDate(pickup.at)} · {timeLabel(pickup.at)}</span>
      <span><MapPin size={16} />{donation.area}</span>
      <span><Clock3 size={16} />{pickup.collector ?? 'Collector to be assigned'}</span>
    </div>
    {next && <button className="button primary" onClick={() => onStatus(pickup.id, next)}>{pickupActionLabels[next]}</button>}
    {pickup.status === 'Awaiting assignment' && (role === 'admin' || role === 'ngo') &&
      <div className="row-actions pickup-actions">
        <button className="button secondary compact" onClick={() => onAssign(pickup.id, collectorName)}>Assign volunteer</button>
        <button className="button secondary compact" onClick={() => onAssign(pickup.id, 'NGO self-collection')}>Self-collect</button>
      </div>}
  </article>;
}

export function Pickups({ state, role, historyOnly = false, onStatus, onAssign }: {
  state: DemoState; role: Role; historyOnly?: boolean; onStatus: (id: string, status: PickupStatus) => void;
  onAssign: (id: string, collector: string) => void;
}) {
  const [historyTab, setShowHistory] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const showHistory = historyOnly || historyTab;
  const stops = useMemo(() => rolePickupStops(state, role)
    .filter(({ pickup }) => showHistory === (pickup.status === 'Received'))
    .sort((a, b) => showHistory ? b.pickup.at.localeCompare(a.pickup.at) : a.pickup.at.localeCompare(b.pickup.at)),
  [role, showHistory, state]);


  function renderDetails(stop: PickupStop) {
    return <PickupCard key={stop.pickup.id} {...stop} state={state} role={role} onStatus={onStatus} onAssign={onAssign} />;
  }

  return <>
    <PageTitle title={historyOnly ? 'Handover history' : role === 'volunteer' ? 'Assigned pickups' : 'Pickups'}
      description="Coordinate collection, track handovers, and see confirmed receipts." />
    <div className="pickup-toolbar">
      {!historyOnly && <div className="segmented" role="group" aria-label="Pickup history">
        <button aria-pressed={!showHistory} onClick={() => setShowHistory(false)}>Active</button>
        <button aria-pressed={showHistory} onClick={() => setShowHistory(true)}>History</button>
      </div>}
      <div className="segmented" role="group" aria-label="Pickup view">
        <button aria-pressed={!showMap} onClick={() => setShowMap(false)}><List size={16} aria-hidden="true" />List</button>
        <button aria-pressed={showMap} onClick={() => setShowMap(true)}><MapIcon size={16} aria-hidden="true" />Map</button>
      </div>
    </div>
    {!stops.length ? <section className="panel"><Empty title={showHistory ? 'No confirmed receipts' : 'No active pickups'}
      description={showHistory ? 'Completed handovers will appear here.' : 'Scheduled collections will appear here after approval.'} /></section>
      : showMap ? <Suspense fallback={<div className="panel pickup-map-loading" role="status">Loading map…</div>}>
        <PickupMap stops={stops} renderDetails={renderDetails} />
      </Suspense> : <div className="cards-grid">{stops.map(renderDetails)}</div>}
  </>;
}

export function DemandView({ state, save }: { state: DemoState; save: (demand: Demand) => void }) {
  const [category, setCategory] = useState<Category>(categories[0]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const deadline = new Date(String(values.get('neededBy')));
    if (!Number.isFinite(deadline.getTime()) || deadline.getTime() <= Date.now()) {
      const control = event.currentTarget.elements.namedItem('neededBy') as HTMLInputElement;
      control.setCustomValidity('Enter a future date and time.');
      control.reportValidity();
      return;
    }
    save({ category, kilograms: Number(values.get('kg')), neededBy: deadline.toISOString() });
    event.currentTarget.reset();
    setCategory(categories[0]);
  }

  return <>
    <PageTitle title="Food demand" description="Record quantities your organization can use and when they are needed." />
    <div className="dashboard-grid">
      <section className="panel list-panel">
        <div className="panel-header"><div><h2>Current needs</h2><p>{state.partners.find(({ id }) => id === activeNgoId)?.name ?? 'Your NGO'}</p></div></div>
        {state.demand.map((demand) => <div className="list-row" key={demand.category}>
          <CategoryIcon category={demand.category} /><div className="list-main"><h3>{demand.category}</h3>
            <p>Needed by {formatDate(demand.neededBy)} · {timeLabel(demand.neededBy)}</p></div>
          <strong>{kgLabel(demand.kilograms)} kg</strong>
        </div>)}
      </section>
      <section className="panel info-panel">
        <h2>Update a need</h2>
        <form className="form-stack" onSubmit={submit}>
          <label>Food category<select value={category} onChange={(event) => setCategory(event.target.value as Category)}>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select></label>
          <label>Quantity in kilograms<input name="kg" type="number" step="0.1" min="0.1" max="10000" required /></label>
          <label>Needed by<input name="neededBy" type="datetime-local" required onInput={(event) => event.currentTarget.setCustomValidity('')} /></label>
          <button className="button primary" type="submit">Save need</button>
        </form>
      </section>
    </div>
  </>;
}

export function Partners({ state, onVerify }: { state: DemoState; onVerify: (id: string) => void }) {
  return <>
    <PageTitle title="Partner verification" description="Review organizations and control access to live donation workflows." />
    <section className="panel list-panel">
      {state.partners.map((partner) => <article className="list-row" key={partner.id}>
        <span className="icon-tile sage"><ShieldCheck size={19} /></span>
        <div className="list-main"><h3>{partner.name}</h3><p>{partner.area} · {kgLabel(partner.capacityKg)} kg capacity</p></div>
        <div className="row-actions"><Badge status={partner.verified ? 'Verified' : 'Pending review'} />
          {!partner.verified && <button className="button primary compact" onClick={() => onVerify(partner.id)}>Verify partner</button>}
        </div>
      </article>)}
    </section>
  </>;
}

export function requestProblem(donation: Donation, state: DemoState, request: DonationRequest) {
  if (getStatus(donation, state.pickups) !== 'Open' || request.packages > getAvailable(donation, state.pickups)) {
    return 'This offer no longer has enough available packages.';
  }
  if (!state.partners.some((partner) => partner.id === request.ngoId && partner.verified)) {
    return 'The receiving organization must be verified.';
  }
  return '';
}

export function NgoNetwork({ state }: { state: DemoState }) {
  const verified = state.partners.filter((partner) => partner.verified);
  return <>
    <PageTitle title="NGO network" description="Browse verified receiving organisations and the food they can accept." />
    {verified.length ? <div className="cards-grid">{verified.map((partner) => <article className="panel offer-card" key={partner.id}>
      <div className="card-top"><span className="icon-tile sage"><HeartHandshake size={19} /></span><Badge status="Verified" /></div>
      <h3>{partner.name}</h3><p>{partner.area} · {kgLabel(partner.capacityKg)} kg capacity</p>
      <p>{partner.categories.join(', ')}</p>
    </article>)}</div> : <section className="panel"><Empty title="No verified partners" description="Verified organisations will appear here." /></section>}
  </>;
}

export function NgoCapacity({ state }: { state: DemoState }) {
  const partner = state.partners.find(({ id }) => id === activeNgoId);
  const reserved = rolePickupStops(state, 'ngo').filter(({ pickup }) => pickup.status !== 'Received')
    .reduce((sum, { pickup, donation }) => sum + kg(donation, pickup.packages), 0);

  return <>
    <PageTitle title="Receiving capacity" description="Review how much food your organisation can take and what is already reserved." />
    {partner ? <section className="panel info-panel">
      <h2>{partner.name}</h2>
      <dl className="detail-grid">
        <div><dt>Total capacity</dt><dd>{kgLabel(partner.capacityKg)} kg</dd></div>
        <div><dt>Reserved for active pickups</dt><dd>{kgLabel(reserved)} kg</dd></div>
        <div><dt>Available capacity</dt><dd>{kgLabel(Math.max(0, partner.capacityKg - reserved))} kg</dd></div>
        <div><dt>Accepted categories</dt><dd>{partner.categories.join(', ')}</dd></div>
      </dl>
    </section> : <section className="panel"><Empty title="No organisation profile" description="A partner profile is needed to show capacity." /></section>}
  </>;
}
