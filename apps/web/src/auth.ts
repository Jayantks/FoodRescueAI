import type { Role } from './demo';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  organization: string;
  role: Role;
}

export interface Session {
  user: AuthUser;
  expiresAt: number;
}

export const roleLabels: Record<Role, string> = {
  donor: 'Food donor',
  ngo: 'NGO partner',
  volunteer: 'Volunteer',
  admin: 'Administrator',
};

async function sessionFrom(response: Response): Promise<Session> {
  if (!response.ok) throw new Error('The sign-in service is unavailable. Please try again.');
  const data: Session = await response.json();
  if (!data.user || !Object.hasOwn(roleLabels, data.user.role) || !Number.isFinite(data.expiresAt)) {
    throw new Error('The sign-in service returned an invalid session.');
  }
  return data;
}

export async function restoreSession(signal: AbortSignal) {
  const response = await fetch('/api/users/me', { cache: 'no-store', signal });
  return response.status === 401 ? null : sessionFrom(response);
}

export async function signIn(email: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (response.status === 401 || response.status === 429) {
    const { error } = await response.json();
    throw new Error(error);
  }
  return sessionFrom(response);
}

export async function signOut() {
  const response = await fetch('/api/auth/logout', { method: 'POST' });
  if (!response.ok) throw new Error('Sign out failed. Please try again.');
}
