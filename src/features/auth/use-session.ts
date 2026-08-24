import { ApiError } from '@/lib/api-error';

import { useCurrentUser } from './api';
import { useSessionStore } from './session-store';
import type { AuthUser } from './types';

export interface Session {
  user: AuthUser | null;
  /** A token is held and `GET /users/me` has confirmed it. */
  isAuthenticated: boolean;
  /** A token is held but has not been exchanged for a user yet — decide nothing until false. */
  isLoading: boolean;
  isAdmin: boolean;
  /** A non-401 failure. A 401 is not surfaced here: it clears the session instead. */
  error: Error | null;
}

/**
 * The session as screens should read it.
 *
 * The token alone is not proof of a session — it may have been superseded since it was
 * issued. `isAuthenticated` therefore means "token present *and* the server confirmed it",
 * which is why `isLoading` exists: redirecting on a token that has not been checked yet would
 * bounce every signed-in user off protected routes on each page load.
 */
export function useSession(): Session {
  const token = useSessionStore((state) => state.token);
  const { data, isPending, error } = useCurrentUser();

  const hasToken = token !== null;
  // A 401 has already cleared the token via the client's global handler; reporting it as an
  // error too would make guards render a failure instead of a redirect to sign-in.
  const unexpectedError = error instanceof ApiError && error.isUnauthorized ? null : error;

  return {
    user: data ?? null,
    isAuthenticated: hasToken && data !== undefined,
    isLoading: hasToken && isPending && !unexpectedError,
    isAdmin: data?.type === 'admin',
    error: unexpectedError,
  };
}
