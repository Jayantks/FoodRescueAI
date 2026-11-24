import { useState, type FormEvent } from 'react';
import { CalendarDays, MapPin, Package } from 'lucide-react';
import {
  activeNgoId, categories, donorName, formatDate, getAvailable, getStatus, id, kg, kgLabel,
  timeLabel, type Category, type DemoState, type Donation, type Role,
} from './demo';
import { Badge, Dialog } from './ui';

export function CreateDonation({ onClose, save }: { onClose: () => void; save: (donation: Donation) => void }) {
  const [error, setError] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const value = (key: string) => String(values.get(key) ?? '').trim();
    const pickup = new Date(value('pickup'));
    const cutoff = new Date(value('cutoff'));
    if (!value('name') || !value('batch') || !value('area') || !value('notes')) {
      setError('Fill in the food name, batch, area, and storage instructions.');
      return;
    }
    if (!Number.isFinite(pickup.getTime()) || !Number.isFinite(cutoff.getTime())
      || pickup.getTime() <= Date.now() || cutoff <= pickup) {
      setError('Choose a future pickup time and a later use-by cutoff.');
      return;
    }
    save({
      id: id(), name: value('name'), category: value('category') as Category, organization: donorName,
      packages: Number(value('packages')), grams: Number(value('grams')), area: value('area'), batch: value('batch'),
      pickupAt: pickup.toISOString(), cutoffAt: cutoff.toISOString(), notes: value('notes'),
    });
  }

  return <Dialog title="New donation" description="List a sealed, shelf-stable batch for verified NGOs." onClose={onClose}>
    <form className="dialog-form form-stack" onSubmit={submit}>
      <label>Food name<input name="name" placeholder="e.g. Sealed rice packs" maxLength={90} required /></label>
      <div className="form-grid">
        <label>Food category<select name="category">{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Batch number<input name="batch" placeholder="e.g. B-214" maxLength={40} required /></label>
        <label>Number of packages<input name="packages" type="number" min="1" max="100000" required /></label>
        <label>Grams per package<input name="grams" type="number" min="1" max="100000" required /></label>
        <label>Pickup date and time<input name="pickup" type="datetime-local" required /></label>
        <label>Use-by cutoff<input name="cutoff" type="datetime-local" required /></label>
      </div>
      <label>Pickup area<input name="area" placeholder="e.g. Central district" maxLength={70} required /></label>
      <label>Storage instructions<textarea name="notes" placeholder="e.g. Store in a cool, dry place" maxLength={240} required rows={2} /></label>
      <label className="check-label"><input type="checkbox" required />I confirm that the original labels and packaging are intact.</label>
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="dialog-actions">
        <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="button primary">Publish donation</button>
      </div>
    </form>
  </Dialog>;
}

export function DonationDetails({ donation, state, role, onClose, request, setHold, showMatches }: {
  donation: Donation; state: DemoState; role: Role; onClose: () => void; request: (packages: number) => void;
  setHold: (held: boolean) => void; showMatches: () => void;
}) {
  const remaining = getAvailable(donation, state.pickups);
  const status = getStatus(donation, state.pickups);
  const requested = state.requests.some(({ donationId, ngoId, status }) =>
    donation.id === donationId && ngoId === activeNgoId && status === 'Pending');
  const canRequest = role === 'ngo' && status === 'Open' && !requested;
  const canModerate = role === 'admin' && ['Open', 'On hold'].includes(status)
    && Date.parse(donation.cutoffAt) > Date.now();
  return <Dialog title={donation.name} description={donation.organization + ' · ' + donation.category} onClose={onClose}>
    <div className="dialog-body">
      <Badge status={status} />
      <dl className="detail-grid">
        <div><dt><Package size={15} /> Available</dt><dd>{remaining} packs · {kgLabel(kg(donation, remaining))} kg</dd></div>
        <div><dt><MapPin size={15} /> Pickup area</dt><dd>{donation.area}</dd></div>
        <div><dt><CalendarDays size={15} /> Pickup starts</dt><dd>{formatDate(donation.pickupAt)} · {timeLabel(donation.pickupAt)}</dd></div>
        <div><dt><CalendarDays size={15} /> Use-by cutoff</dt><dd>{formatDate(donation.cutoffAt)} · {timeLabel(donation.cutoffAt)}</dd></div>
        <div><dt>Batch</dt><dd>{donation.batch}</dd></div>
        <div><dt>Storage</dt><dd>{donation.notes}</dd></div>
      </dl>
      {role === 'ngo' && requested && <p className="helper">Your NGO already has a pending request for this donation.</p>}
      {canRequest && <form className="form-stack" onSubmit={(event) => {
        event.preventDefault();
        request(Number(new FormData(event.currentTarget).get('packages')));
      }}>
        <label>Packages to request<input name="packages" type="number" min="1" max={remaining} defaultValue={remaining} required /></label>
        <button className="button primary" type="submit">Request donation</button>
      </form>}
      {role === 'donor' && status === 'Open' && <button className="button primary" onClick={showMatches}>See NGO matches</button>}
      {canModerate && <button className="button secondary" onClick={() => setHold(!donation.held)}>
        {donation.held ? 'Release hold' : 'Place on hold'}
      </button>}
    </div>
  </Dialog>;
}
