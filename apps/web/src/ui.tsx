import { useEffect, useId, useRef, type ReactNode } from 'react';
import {
  Archive, Backpack, Bean, Box, Croissant, CupSoda, Ellipsis, MapPin, PackageOpen,
  type LucideIcon,
} from 'lucide-react';
import {
  formatDate, getAvailable, getStatus, kg, kgLabel, type Category, type Donation, type Pickup,
} from './demo';

const categoryIcons: Record<Category, LucideIcon> = {
  'Dry groceries': Bean,
  Bakery: Croissant,
  'Packaged snacks': Backpack,
  'Canned foods': Archive,
  Beverages: CupSoda,
};

const categoryColors: Record<Category, string> = {
  'Dry groceries': 'sage',
  Bakery: 'sand',
  'Packaged snacks': 'plum',
  'Canned foods': 'blue',
  Beverages: 'blue',
};

export function CategoryIcon({ category }: { category: Category }) {
  const Icon = categoryIcons[category];
  return <span className={'icon-tile ' + categoryColors[category]}><Icon size={17} aria-hidden="true" /></span>;
}

export function Badge({ status }: { status: string }) {
  const tone = ['Open', 'Approved', 'Received', 'Verified', 'Completed'].includes(status) ? 'sage'
    : ['Scheduled', 'En route', 'In pickup', 'Collected'].includes(status) ? 'blue'
      : ['Expired', 'On hold', 'Declined'].includes(status) ? 'muted' : 'sand';
  return <span className={'status ' + tone}><span aria-hidden="true" />{status}</span>;
}

export function Empty({ title, description }: { title: string; description: string }) {
  return <div className="empty">
    <span className="icon-tile sage"><PackageOpen size={22} aria-hidden="true" /></span>
    <strong>{title}</strong><p>{description}</p>
  </div>;
}

export function PageTitle({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="page-title">
    <div><h1>{title}</h1><p>{description}</p></div>
    {action}
  </div>;
}

export function Dialog({ title, description, onClose, children }: {
  title: string; description?: string; onClose: () => void; children: ReactNode;
}) {
  const element = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = element.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  return <dialog
    className="dialog"
    ref={element}
    aria-labelledby={titleId}
    aria-describedby={description ? descriptionId : undefined}
    onCancel={(event) => { event.preventDefault(); onClose(); }}
  >
    <div className="dialog-header">
      <div><h2 id={titleId}>{title}</h2>{description && <p id={descriptionId}>{description}</p>}</div>
      <button className="icon-button dialog-close" type="button" onClick={onClose} aria-label="Close dialog">×</button>
    </div>
    {children}
  </dialog>;
}

export function DonationTable({ donations, pickups, onInspect }: {
  donations: Donation[]; pickups: Pickup[]; onInspect: (id: string) => void;
}) {
  if (!donations.length) return <Empty title="No matching donations" description="Change the filters to see more offers." />;
  return <div className="table-scroll">
    <table>
      <thead><tr>
        <th scope="col">Donation</th><th scope="col">Quantity</th><th scope="col">Pickup date</th>
        <th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th>
      </tr></thead>
      <tbody>{donations.map((donation) => <tr key={donation.id}>
        <td><div className="food-cell"><CategoryIcon category={donation.category} />
          <div><strong>{donation.name}</strong><small>{donation.category}</small></div>
        </div></td>
        <td>{kgLabel(kg(donation))} kg<span className="table-secondary"> · {donation.packages} packs</span></td>
        <td>{formatDate(donation.pickupAt)}</td>
        <td><Badge status={getStatus(donation, pickups)} /></td>
        <td><button className="icon-button row-button" aria-label={'View ' + donation.name} onClick={() => onInspect(donation.id)}><Ellipsis size={18} /></button></td>
      </tr>)}</tbody>
    </table>
  </div>;
}

export function OfferCard({ donation, pickups, onInspect }: {
  donation: Donation; pickups: Pickup[]; onInspect: (id: string) => void;
}) {
  const available = getAvailable(donation, pickups);
  return <article className="panel offer-card">
    <div className="card-top"><CategoryIcon category={donation.category} /><Badge status={getStatus(donation, pickups)} /></div>
    <h3>{donation.name}</h3><p>{donation.organization}</p>
    <div className="card-facts">
      <span><Box size={16} />{available} packs · {kgLabel(kg(donation, available))} kg</span>
      <span><MapPin size={16} />{donation.area}</span>
    </div>
    <button className="button secondary" onClick={() => onInspect(donation.id)}>View donation</button>
  </article>;
}
