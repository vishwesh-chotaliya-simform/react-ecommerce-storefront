import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';

import type { AuthUser } from '@/features/auth/types';
import { ADMIN, CUSTOMER } from '@/test/msw/fixtures';
import { fail, ok } from '@/test/msw/envelope';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';

import { AdminRoute, GuestOnlyRoute, ProtectedRoute } from './guards';
import { intendedPath } from './redirect-state';
import SigninPage from './signin';

const signedInAs = (user: AuthUser) => server.use(http.get('/api/users/me', () => ok(user)));

/** A miniature app: enough routes to watch a guard redirect and land somewhere. */
function TestApp() {
  return (
    <Routes>
      <Route path="/" element={<h1>Catalog</h1>} />
      <Route path="/signin" element={<SignInSpy />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/account" element={<h1>Account</h1>} />
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<h1>Admin dashboard</h1>} />
        </Route>
      </Route>
      <Route element={<GuestOnlyRoute />}>
        <Route path="/signup" element={<h1>Create an account</h1>} />
      </Route>
    </Routes>
  );
}

/**
 * Stands in for the real sign-in screen, reporting where it was told to return to.
 *
 * Reads the router's own location rather than `window.history`: under `MemoryRouter` the
 * navigation state never reaches the browser's history object.
 */
function SignInSpy() {
  const location = useLocation();
  return (
    <>
      <h1>Sign in</h1>
      <p data-testid="return-to">{intendedPath(location.state)}</p>
    </>
  );
}

describe('route guards', () => {
  it('sends a signed-out visitor from a protected route to sign-in', async () => {
    renderWithProviders(<TestApp />, { route: '/account', token: null });

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Account' })).not.toBeInTheDocument();
  });

  it('lets a confirmed session through', async () => {
    signedInAs(CUSTOMER);
    renderWithProviders(<TestApp />, { route: '/account', token: 'valid-token' });

    expect(await screen.findByRole('heading', { name: 'Account' })).toBeInTheDocument();
  });

  it('waits for the session check instead of bouncing on a token it has not verified', async () => {
    signedInAs(CUSTOMER);
    renderWithProviders(<TestApp />, { route: '/account', token: 'valid-token' });

    // The redirect must not happen in the gap between reading localStorage and /users/me.
    expect(screen.getByText('Checking your session…')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Account' })).toBeInTheDocument();
  });

  it('turns a customer away from an admin route without signing them out', async () => {
    signedInAs(CUSTOMER);
    renderWithProviders(<TestApp />, { route: '/admin', token: 'valid-token' });

    expect(await screen.findByRole('heading', { name: 'Admins only' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('admits an admin', async () => {
    signedInAs(ADMIN);
    renderWithProviders(<TestApp />, { route: '/admin', token: 'valid-token' });

    expect(await screen.findByRole('heading', { name: 'Admin dashboard' })).toBeInTheDocument();
  });

  it('keeps a signed-in user off the guest-only screens', async () => {
    signedInAs(CUSTOMER);
    renderWithProviders(<TestApp />, { route: '/signup', token: 'valid-token' });

    expect(await screen.findByRole('heading', { name: 'Catalog' })).toBeInTheDocument();
  });

  it('shows a network failure rather than pretending the user is signed out', async () => {
    server.use(http.get('/api/users/me', () => fail(500, 'Internal server error')));
    renderWithProviders(<TestApp />, { route: '/account', token: 'valid-token' });

    expect(await screen.findByText('Could not verify your session')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument();
  });
});

describe('redirect back after signing in', () => {
  it('records the path the guard turned you away from', async () => {
    renderWithProviders(<TestApp />, { route: '/account?tab=orders', token: null });
    await screen.findByRole('heading', { name: 'Sign in' });

    // The guard stores the full path — query string included — in navigation state.
    expect(screen.getByTestId('return-to')).toHaveTextContent('/account?tab=orders');
  });

  it('falls back to the catalog rather than trusting an off-site path', () => {
    expect(intendedPath({ from: '/orders' })).toBe('/orders');
    expect(intendedPath({ from: '//evil.example' })).toBe('/');
    expect(intendedPath({ from: '/\\evil.example' })).toBe('/');
    expect(intendedPath({ from: 'https://evil.example' })).toBe('/');
    expect(intendedPath(undefined)).toBe('/');
  });
});

describe('signing in returns you to where you were headed', () => {
  it('lands back on the route the guard turned you away from', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('/api/users/signin', () =>
        ok({ user: CUSTOMER, token: 'fresh-token' }, 'Signed in successfully'),
      ),
      http.get('/api/users/me', () => ok(CUSTOMER)),
    );

    // The real sign-in screen, mounted where the guard would send someone.
    renderWithProviders(
      <Routes>
        <Route path="/" element={<h1>Catalog</h1>} />
        <Route path="/signin" element={<SigninPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/account" element={<h1>Account</h1>} />
        </Route>
      </Routes>,
      { route: '/account', token: null },
    );

    // Turned away first.
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Email'), 'customer@shop.dev');
    await user.type(screen.getByLabelText('Password'), 'Cust@12345');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    // …and returned to the original destination, not dropped on the catalog.
    expect(await screen.findByRole('heading', { name: 'Account' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Catalog' })).not.toBeInTheDocument();
  });
});
