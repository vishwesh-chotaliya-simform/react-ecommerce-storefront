import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import { ApiError } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

import { useSessionStore } from './session-store';
import type {
  AuthUser,
  ForgotPasswordBody,
  ForgotPasswordResult,
  ResetPasswordBody,
  SigninBody,
  SigninResult,
  SignupBody,
  SignupResult,
} from './types';

/* ------------------------------------------------------------------ queries */

/**
 * The signed-in user, re-read from the server on every load.
 *
 * This is what makes a refresh keep you signed in: `localStorage` holds the token, and this
 * query turns that token back into a user. It is also the only honest check that the token is
 * still good — `tokenVersion` may have been bumped since it was issued.
 */
export function useCurrentUser() {
  const token = useSessionStore((state) => state.token);

  return useQuery({
    queryKey: queryKeys.session.currentUser(),
    queryFn: ({ signal }) => api.get<AuthUser>('/users/me', { signal }),
    // No token means no request to make — not a request that happens to fail.
    enabled: token !== null,
    // The user object changes rarely, and a 401 arrives on its own if the token dies.
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/* ---------------------------------------------------------------- mutations */

/**
 * Sign in, then hold the token.
 *
 * The user goes into the cache directly from the response rather than being refetched — the
 * payload is the same shape `GET /users/me` returns, so a second round trip would only
 * confirm what we already have.
 */
export function useSignin() {
  const queryClient = useQueryClient();
  const setToken = useSessionStore((state) => state.setToken);

  return useMutation({
    mutationFn: (body: SigninBody) =>
      api.post<SigninResult>('/users/signin', body, { auth: false }),
    onSuccess: (result) => {
      setToken(result.token);
      queryClient.setQueryData(queryKeys.session.currentUser(), result.user);
    },
  });
}

/**
 * Register, then sign in with the same credentials.
 *
 * `POST /users/signup` returns `{ name, email, type }` and **no token** — it creates the
 * account without starting a session. Rather than dropping a freshly registered user on the
 * sign-in screen to retype what they just typed, the second call is made here. The account
 * exists either way; only the session is at stake if the sign-in leg fails.
 */
export function useSignup() {
  const queryClient = useQueryClient();
  const setToken = useSessionStore((state) => state.setToken);

  return useMutation({
    mutationFn: async (body: SignupBody): Promise<SigninResult> => {
      await api.post<SignupResult>('/users/signup', body, { auth: false });

      return api.post<SigninResult>(
        '/users/signin',
        { email: body.email, password: body.password },
        { auth: false },
      );
    },
    onSuccess: (result) => {
      setToken(result.token);
      queryClient.setQueryData(queryKeys.session.currentUser(), result.user);
    },
  });
}

/**
 * Sign out everywhere, then forget everything locally.
 *
 * The server bumps `tokenVersion`, which kills every token already issued for this account —
 * so the local clear has to happen even if the request fails, otherwise the app would hold a
 * token the server has already rejected. `queryClient.clear()` matters just as much: without
 * it the next user to sign in on this browser inherits the previous one's cart and orders
 * from memory.
 */
export function useSignout() {
  const queryClient = useQueryClient();
  const clearSession = useSessionStore((state) => state.clearSession);

  return useMutation({
    mutationFn: async () => {
      try {
        await api.post<null>('/users/signout');
      } catch (error) {
        // A 401 here means the token was already dead — the desired end state, not a failure.
        if (!(error instanceof ApiError) || !error.isUnauthorized) throw error;
      }
    },
    onSettled: () => {
      clearSession();
      queryClient.clear();
    },
  });
}

/** Requests an OTP. The backend has no mailer, so the OTP comes back in the response. */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (body: ForgotPasswordBody) =>
      api.post<ForgotPasswordResult>('/users/forgot-password', body, { auth: false }),
  });
}

/**
 * Resets the password. Returns no data — the backend bumps `tokenVersion`, so every existing
 * session dies and the user has to sign in again with the new password.
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: (body: ResetPasswordBody) =>
      api.post<null>('/users/reset-password', body, { auth: false }),
  });
}
