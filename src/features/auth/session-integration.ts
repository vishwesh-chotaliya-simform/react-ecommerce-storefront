import { configureApiClient } from '@/lib/api-client';
import { queryClient } from '@/lib/query-client';

import { getSessionToken, useSessionStore } from './session-store';

/**
 * Teach the API client about the session: where the token comes from, and what a 401 means.
 *
 * Tokens carry a `tokenVersion` that the server checks on every request, and sign-out,
 * password change, and password reset all bump it — so a 401 can arrive on any request at any
 * time, not only at sign-in. Handling it here means no caller has to.
 *
 * Clearing the query cache matters as much as clearing the token: TanStack Query would
 * otherwise keep the previous user's cart and orders in memory.
 */
export function installSessionIntegration(): void {
  configureApiClient({
    getToken: getSessionToken,
    onUnauthorized: () => {
      if (!getSessionToken()) return;

      useSessionStore.getState().clearSession();
      queryClient.clear();

      // No imperative redirect from here. Clearing the token re-renders every subscriber, so
      // `ProtectedRoute` sees an unauthenticated session and navigates to /signin with the
      // current path in state — the same path the guard would preserve on a cold load. Doing
      // it declaratively keeps this module free of router imports and keeps the redirect in
      // one place instead of two.
    },
  });
}
