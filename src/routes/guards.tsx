import { Loader2, ShieldX } from 'lucide-react';
import { Link, Navigate, Outlet, useLocation, type Location } from 'react-router';

import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import { useSession } from '@/features/auth/use-session';

import { intendedPath, type RedirectState } from './redirect-state';

function fullPath(location: Location): string {
  return `${location.pathname}${location.search}${location.hash}`;
}

function SessionPending() {
  return (
    <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      <span>Checking your session…</span>
    </div>
  );
}

/**
 * Requires a confirmed session.
 *
 * The wait on `isLoading` is the important part: on a page load the token is read from
 * `localStorage` instantly but is not yet known to be valid, and redirecting during that gap
 * would sign the user out on every refresh.
 */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading, error } = useSession();
  const location = useLocation();

  if (isLoading) return <SessionPending />;

  // A network failure is not a signed-out user — say so instead of bouncing them to sign-in.
  if (error) return <ErrorState error={error} title="Could not verify your session" />;

  if (!isAuthenticated) {
    const state: RedirectState = { from: fullPath(location) };
    return <Navigate to="/signin" state={state} replace />;
  }

  return <Outlet />;
}

/**
 * Requires the admin role. Nest inside {@link ProtectedRoute}, which handles "not signed in";
 * this only answers "signed in, but allowed?".
 */
export function AdminRoute() {
  const { isAdmin, isLoading } = useSession();

  if (isLoading) return <SessionPending />;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-24 text-center">
        <ShieldX className="mx-auto size-10 text-muted-foreground" aria-hidden />
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Admins only</h1>
          <p className="text-sm text-muted-foreground">
            This area is restricted to administrator accounts.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/">Back to the catalog</Link>
        </Button>
      </div>
    );
  }

  return <Outlet />;
}

/**
 * The inverse guard: keeps a signed-in user off the sign-in and sign-up screens, sending them
 * where they were originally headed instead.
 */
export function GuestOnlyRoute() {
  const { isAuthenticated, isLoading } = useSession();
  const location = useLocation();

  if (isLoading) return <SessionPending />;
  if (isAuthenticated) return <Navigate to={intendedPath(location.state)} replace />;

  return <Outlet />;
}
