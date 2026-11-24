import { rankCandidates } from '@foodbridge/matching';

export const categories = ['Dry groceries', 'Bakery', 'Packaged snacks', 'Canned foods', 'Beverages'] as const;
export type Category = typeof categories[number];
export type Role = 'donor' | 'ngo' | 'volunteer' | 'admin';
export type PickupStatus = 'Awaiting assignment' | 'Scheduled' | 'En route' | 'Collected' | 'Received';

export interface Donation {
  id: string;
  name: string;
  category: Category;
  organization: string;
  packages: number;
  grams: number;
  area: string;
  batch: string;
  pickupAt: string;
  cutoffAt: string;
  notes: string;
  held?: boolean;
}

export interface DonationRequest {
  id: string;
  donationId: string;
  ngoId: string;
  packages: number;
  status: 'Pending' | 'Approved' | 'Declined';
}

export interface Pickup {
  id: string;
  donationId: string;
  ngoId: string;
  packages: number;
  at: string;
  status: PickupStatus;
  collector?: string;
  receivedAt?: string;
}

export interface Partner {
  id: string;
  name: string;
  area: string;
  distanceKm: number;
  travelMinutes: number;
  capacityKg: number;
  hoursUntilNeeded: number;
  categories: Category[];
  verified: boolean;
}

export interface Demand {
  category: Category;
  kilograms: number;
  neededBy: string;
}

export interface DemoState {
  donations: Donation[];
  requests: DonationRequest[];
  pickups: Pickup[];
  partners: Partner[];
  demand: Demand[];
}

export const donorName = 'Green Basket Market';
export const activeNgoId = 'ngo-1';
export const collectorName = 'Arjun Mehta';

export const id = () => crypto.randomUUID();

export function sampleTime(offset: number, hours = 12, minutes = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

export function formatDate(value: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
  return new Intl.DateTimeFormat('en-IN', options).format(new Date(value));
}

export const timeLabel = (value: string) => formatDate(value, { hour: 'numeric', minute: '2-digit', hour12: true });
export const kgLabel = (value: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(value);
export const kg = (donation: Donation, packages = donation.packages) => (packages * donation.grams) / 1000;

function offer(
  id: string, name: string, category: Category, packages: number, grams: number,
  area: string, pickupAt: string, cutoffAt: string, organization = donorName,
): Donation {
  return { id, name, category, packages, grams, area, pickupAt, cutoffAt, organization, batch: 'FB-' + id,
    notes: 'Original packaging intact. Store in a cool, dry place.' };
}

function run(id: string, donationId: string, ngoId: string, packages: number, at: string, status: PickupStatus, collector?: string): Pickup {
  return { id, donationId, ngoId, packages, at, status, collector, receivedAt: status === 'Received' ? at : undefined };
}

export function createDemoState(): DemoState {
  const pastWeights = [32, 49, 40, 65, 46, 76, 57, 42, 73, 58, 96, 72, 110, 91];
  const transfers = pastWeights.map((amount, index) => {
    const at = sampleTime(index - pastWeights.length);
    const donation = offer('H-' + index, 'Assorted shelf-stable groceries', 'Dry groceries', amount, 1000, 'Central district', at, at);
    return { donation, pickup: run('FH-' + index, donation.id, 'ngo-1', amount, at, 'Received', collectorName) };
  });

  return {
    donations: [
      offer('1042', 'Assorted dry groceries', 'Dry groceries', 60, 1000, 'Central district', sampleTime(1, 10), sampleTime(2, 17)),
      offer('1041', 'Sealed bread and biscuits', 'Bakery', 36, 500, 'Central district', sampleTime(1, 15, 30), sampleTime(2, 17)),
      offer('1040', 'Canned chickpeas', 'Canned foods', 48, 500, 'West district', sampleTime(2, 11), sampleTime(5, 17)),
      offer('1039', 'Individually packed crackers', 'Packaged snacks', 50, 250, 'Central district', sampleTime(2, 10), sampleTime(5, 17)),
      offer('1038', 'Shelf-stable juice cartons', 'Beverages', 40, 250, 'West district', sampleTime(3, 11), sampleTime(6, 17)),
      offer('1037', 'Fortified rice packs', 'Dry groceries', 25, 2000, 'North district', sampleTime(1, 12), sampleTime(4, 17), 'Harvest Pantry'),
      offer('1036', 'Roasted gram snack packs', 'Packaged snacks', 32, 500, 'Central district', sampleTime(1, 11), sampleTime(2, 17), 'Harvest Pantry'),
      offer('1035', 'Sealed oats', 'Dry groceries', 12, 1000, 'Central district', sampleTime(-3), sampleTime(-2)),
      ...transfers.slice().reverse().map(({ donation }) => donation),
    ],
    requests: [
      { id: 'RQ-31', donationId: '1042', ngoId: 'ngo-1', packages: 14, status: 'Pending' },
      { id: 'RQ-30', donationId: '1039', ngoId: 'ngo-2', packages: 20, status: 'Pending' },
      { id: 'RQ-29', donationId: '1038', ngoId: 'ngo-3', packages: 14, status: 'Pending' },
    ],
    pickups: [
      run('PU-201', '1041', 'ngo-1', 36, sampleTime(1, 15, 30), 'Scheduled', collectorName),
      run('PU-202', '1040', 'ngo-2', 24, sampleTime(2, 11), 'Scheduled', 'NGO self-collection'),
      run('PU-203', '1039', 'ngo-3', 10, sampleTime(2, 15), 'Awaiting assignment'),
      ...transfers.map(({ pickup }) => pickup),
    ],
    partners: [
      { id: 'ngo-1', name: 'Community Food Trust', area: 'Central district', distanceKm: 3.2, travelMinutes: 14, capacityKg: 68,
        hoursUntilNeeded: 2, categories: [...categories], verified: true },
      { id: 'ngo-2', name: 'Neighbourhood Kitchen', area: 'West district', distanceKm: 1.8, travelMinutes: 9, capacityKg: 24,
        hoursUntilNeeded: 11, categories: [...categories], verified: true },
      { id: 'ngo-3', name: 'Open Table Foundation', area: 'North district', distanceKm: 5.6, travelMinutes: 22, capacityKg: 46,
        hoursUntilNeeded: 6, categories: [...categories], verified: true },
      { id: 'ngo-4', name: 'Hope Pantry Network', area: 'South district', distanceKm: 4.3, travelMinutes: 20, capacityKg: 40,
        hoursUntilNeeded: 5, categories: ['Dry groceries', 'Packaged snacks'], verified: false },
    ],
    demand: [
      { category: 'Dry groceries', kilograms: 45, neededBy: sampleTime(1, 13) },
      { category: 'Packaged snacks', kilograms: 18, neededBy: sampleTime(2, 15) },
    ],
  };
}

export function getAvailable(donation: Donation, pickups: Pickup[]) {
  const allocated = pickups.filter((pickup) => pickup.donationId === donation.id)
    .reduce((total, pickup) => total + pickup.packages, 0);
  return Math.max(0, donation.packages - allocated);
}

export function getStatus(donation: Donation, pickups: Pickup[]) {
  const related = pickups.filter((pickup) => pickup.donationId === donation.id);
  const remaining = getAvailable(donation, related);
  if (!remaining && related.every((pickup) => pickup.status === 'Received')) return 'Completed';
  if (donation.held) return 'On hold';
  if (new Date(donation.cutoffAt).getTime() <= Date.now()) return 'Expired';
  if (!remaining) return 'In pickup';
  return 'Open';
}

export function matchesFor(donation: Donation, state: DemoState) {
  const available = getAvailable(donation, state.pickups);
  const beginsAt = Math.max(Date.now(), Date.parse(donation.pickupAt));
  const results = rankCandidates(available, state.partners.map((partner) => {
    const reservedKg = state.pickups
      .filter((pickup) => pickup.ngoId === partner.id && pickup.status !== 'Received')
      .reduce((total, pickup) => {
        const item = state.donations.find(({ id }) => id === pickup.donationId);
        return total + (item ? kg(item, pickup.packages) : 0);
      }, 0);
    return {
      id: partner.id,
      eligible: getStatus(donation, state.pickups) === 'Open' && partner.verified && partner.distanceKm <= 10
        && partner.categories.includes(donation.category)
        && beginsAt + (partner.travelMinutes + 15) * 60_000 < Date.parse(donation.cutoffAt),
      allocatablePackages: Math.floor(Math.max(0, partner.capacityKg - reservedKg) * 1000 / donation.grams),
      hoursUntilNeeded: partner.hoursUntilNeeded,
      travelMinutes: partner.travelMinutes,
    };
  }));
  return results.slice(0, 3).flatMap((result) => {
    const partner = state.partners.find(({ id }) => id === result.id);
    return partner ? [{ ...result, partner }] : [];
  });
}

export interface PickupStop {
  pickup: Pickup;
  donation: Donation;
}

export function rolePickupStops(state: DemoState, role: Role): PickupStop[] {
  const donations = new Map(state.donations.map((donation) => [donation.id, donation]));
  return state.pickups.flatMap((pickup) => {
    if (role === 'volunteer' && pickup.collector !== collectorName) return [];
    if (role === 'ngo' && pickup.ngoId !== activeNgoId) return [];
    const donation = donations.get(pickup.donationId);
    if (!donation || (role === 'donor' && donation.organization !== donorName)) return [];
    return [{ pickup, donation }];
  });
}

export function nextPickupStatus(role: Role, pickup: Pickup): PickupStatus | undefined {
  if (role === 'volunteer' && pickup.status === 'Scheduled') return 'En route';
  if (role === 'volunteer' && pickup.status === 'En route') return 'Collected';
  if (role === 'ngo' && pickup.collector === 'NGO self-collection' && pickup.status === 'Scheduled') return 'Collected';
  if (role === 'ngo' && pickup.status === 'Collected') return 'Received';
}
