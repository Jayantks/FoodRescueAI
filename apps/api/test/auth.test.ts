import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { once } from 'node:events';
import test from 'node:test';
import express from 'express';
import { createAuthRouter } from '../src/auth.ts';

test('credentials select the server role, cookies restore sessions, and logout revokes them', async () => {
  const app = express();
  app.use('/api', createAuthRouter());
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');

  try {
    const { port } = server.address() as AddressInfo;
    const base = 'http://127.0.0.1:' + port + '/api';
    const me = (cookie?: string) => fetch(base + '/users/me', { headers: cookie ? { Cookie: cookie } : {} });
    const login = (email: string, password: string) => fetch(base + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role: 'admin' }),
    });

    assert.equal((await me()).status, 401);
    assert.equal((await me('foodrescue_session=invalid')).status, 401);
    assert.equal((await login('donor@foodrescue.demo', 'AdminDemo!26')).status, 401);

    const accounts = [
      ['donor', 'DonorDemo!26'],
      ['ngo', 'NgoDemo!26'],
      ['volunteer', 'VolunteerDemo!26'],
      ['admin', 'AdminDemo!26'],
    ];

    for (const [role, password] of accounts) {
      const response = await login(role + '@foodrescue.demo', password);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const header = response.headers.get('set-cookie');
      assert.ok(header?.includes('HttpOnly') && header.includes('SameSite=Strict'));
      const cookie = header.split(';')[0];
      const session = await response.json();
      assert.equal(session.user.role, role);
      assert.equal(session.user.passwordHash, undefined);
      assert.deepEqual(await (await me(cookie)).json(), session);

      const logout = await fetch(base + '/auth/logout', { method: 'POST', headers: { Cookie: cookie } });
      assert.equal(logout.status, 204);
      assert.match(logout.headers.get('set-cookie') ?? '', /^foodrescue_session=;/);
      assert.equal((await me(cookie)).status, 401);
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
