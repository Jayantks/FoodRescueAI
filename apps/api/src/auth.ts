import { randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { json, Router, type Request } from 'express';
import { rateLimit } from 'express-rate-limit';
import jwt from 'jsonwebtoken';

type Role = 'donor' | 'ngo' | 'volunteer' | 'admin';

interface Account {
  id: string;
  email: string;
  name: string;
  organization: string;
  role: Role;
  passwordHash: string;
}

const accounts: Account[] = [
  { id: 'demo-donor', email: 'donor@foodrescue.demo', name: 'Maya Patel', organization: 'Green Basket Market',
    role: 'donor', passwordHash: '$2b$12$v.A49UxU5zKw/0ML.sTauuAXasQG/DGLWgPGBNM3s0hfzmPazhzb6' },
  { id: 'demo-ngo', email: 'ngo@foodrescue.demo', name: 'Riya Menon', organization: 'Community Food Trust',
    role: 'ngo', passwordHash: '$2b$12$lrVD9HyWhvNi76UFcN0AMO6bzq14v18XxtLLHUABVecVGvy36HdqO' },
  { id: 'demo-volunteer', email: 'volunteer@foodrescue.demo', name: 'Arjun Mehta', organization: 'Volunteer network',
    role: 'volunteer', passwordHash: '$2b$12$vTIBe.5pCX8l/2Mw6J69muqICOXc7EitD93FpSRCHbgcVGQ1CxsXq' },
  { id: 'demo-admin', email: 'admin@foodrescue.demo', name: 'Neha Shah', organization: 'Pilot operations',
    role: 'admin', passwordHash: '$2b$12$Zj/k2qQXfUF381RKCh5nz.Tl7mEeSHl4v3UBqlKg4UfVi8hYK3sQC' },
];

const byEmail = new Map(accounts.map((account) => [account.email, account]));
const byId = new Map(accounts.map((account) => [account.id, account]));
const cookieName = 'foodrescue_session';
const durationSeconds = 8 * 60 * 60;
const issuer = 'foodrescue-ai';
const audience = 'foodrescue-workspace';
const invalidCredentials = { error: 'The email or password is incorrect.' };

interface SessionRecord {
  accountId: string;
  expiresAt: number;
}

function sessionPayload({ id, email, name, organization, role }: Account, expiresAt: number) {
  return { user: { id, email, name, organization, role }, expiresAt };
}

export function createAuthRouter({
  secret = randomBytes(32),
  secureCookie = false,
}: { secret?: string | Buffer; secureCookie?: boolean } = {}) {
  const router = Router();
  const sessions = new Map<string, SessionRecord>();
  const cookie = { httpOnly: true, sameSite: 'strict' as const, path: '/', secure: secureCookie };
  const loginLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 12,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { error: 'Too many sign-in attempts. Please try again in 15 minutes.' },
  });

  function readSession(request: Request) {
    const token = request.headers.cookie?.split(';').map((part) => part.trim())
      .find((part) => part.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
    if (!token || token.length > 4096) return;

    try {
      const claims = jwt.verify(token, secret, { algorithms: ['HS256'], issuer, audience });
      if (typeof claims === 'string' || typeof claims.jti !== 'string' || typeof claims.sub !== 'string') return;
      const record = sessions.get(claims.jti);
      const account = byId.get(claims.sub);
      if (!record || record.accountId !== claims.sub || record.expiresAt <= Date.now() || !account) return;
      return { id: claims.jti, account, expiresAt: record.expiresAt };
    } catch {
      return;
    }
  }

  router.use(['/auth', '/users/me'], (_request, response, next) => {
    response.set('Cache-Control', 'no-store');
    next();
  });

  router.post('/auth/login', loginLimit, json({ limit: '2kb' }), async (request, response) => {
    const { email, password } = request.body ?? {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!normalizedEmail || normalizedEmail.length > 254 || typeof password !== 'string' || !password
        || bcrypt.truncates(password)) {
      response.status(401).json(invalidCredentials);
      return;
    }
    const account = byEmail.get(normalizedEmail);
    const valid = await bcrypt.compare(password, account?.passwordHash ?? accounts[0].passwordHash);
    if (!account || !valid) {
      response.status(401).json(invalidCredentials);
      return;
    }

    const previous = readSession(request);
    if (previous) sessions.delete(previous.id);
    const now = Date.now();
    for (const [id, record] of sessions) {
      if (record.expiresAt <= now) sessions.delete(id);
    }

    const id = randomUUID();
    const expiresAt = (Math.floor(now / 1000) + durationSeconds) * 1000;
    const token = jwt.sign({}, secret, { algorithm: 'HS256', subject: account.id, jwtid: id, issuer, audience,
      expiresIn: durationSeconds });
    sessions.set(id, { accountId: account.id, expiresAt });
    response.cookie(cookieName, token, { ...cookie, maxAge: durationSeconds * 1000 });
    response.json(sessionPayload(account, expiresAt));
  });

  router.get('/users/me', (request, response) => {
    const session = readSession(request);
    if (!session) {
      response.status(401).json({ error: 'Sign in to open your workspace.' });
      return;
    }
    response.json(sessionPayload(session.account, session.expiresAt));
  });

  router.post('/auth/logout', (request, response) => {
    const session = readSession(request);
    if (session) sessions.delete(session.id);
    response.clearCookie(cookieName, cookie);
    response.status(204).end();
  });

  return router;
}
