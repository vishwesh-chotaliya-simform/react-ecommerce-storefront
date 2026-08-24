import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { request } from '@playwright/test';

const API = process.env.E2E_API_URL ?? 'http://localhost:3000';
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
const BACKEND = resolve(process.cwd(), '../node-mongodb-ecommerce-project');
const STORAGE = resolve(process.cwd(), 'e2e/.auth/customer.json');

export const CUSTOMER = { email: 'customer@shop.dev', password: 'Cust@12345' };

/**
 * Put the backend into a known state, then sign in exactly once.
 *
 * Re-seeding matters because there is no test database: previous runs have really placed
 * orders, so stock and carts drift. `npm run seed` restores the twelve products and the two
 * demo accounts. Set `E2E_SKIP_SEED=1` to run against the database as it stands.
 *
 * Signing in here rather than per test is not an optimisation — the backend allows 50 sign-in
 * attempts per 15 minutes, and a suite that authenticated per test would lock itself out.
 */
async function globalSetup() {
  if (process.env.E2E_SKIP_SEED !== '1') {
    execFileSync('npm', ['run', 'seed'], { cwd: BACKEND, stdio: 'inherit' });
  }

  const context = await request.newContext({ baseURL: BASE_URL });

  const response = await context.post(`${API}/users/signin`, { data: CUSTOMER });
  if (!response.ok()) {
    throw new Error(
      `Could not sign in for e2e setup: ${String(response.status())} ${await response.text()}`,
    );
  }

  const { data } = (await response.json()) as { data: { token: string } };

  // Start from an empty cart even when seeding is skipped. Re-seeding recreates the demo
  // users (so their carts go with them), but `E2E_SKIP_SEED=1` does not — and a cart left
  // behind by a half-finished run makes the journey's counts wrong rather than failing
  // honestly.
  await context.delete(`${API}/cart`, {
    headers: { Authorization: `Bearer ${data.token}` },
  });

  // The app keeps its token in localStorage under the Zustand persist key, so the saved
  // storage state has to match that shape exactly rather than being a cookie.
  mkdirSync(dirname(STORAGE), { recursive: true });
  writeFileSync(
    STORAGE,
    JSON.stringify({
      cookies: [],
      origins: [
        {
          origin: BASE_URL,
          localStorage: [
            {
              name: 'storefront-session',
              value: JSON.stringify({ state: { token: data.token }, version: 0 }),
            },
          ],
        },
      ],
    }),
  );

  await context.dispose();
}

export default globalSetup;
