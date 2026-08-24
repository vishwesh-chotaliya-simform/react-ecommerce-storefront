import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Session state — the token and nothing else.
 *
 * Server state does not live here. Products, cart, orders, and the user profile belong to
 * TanStack Query; this store exists because the browser has to hold the bearer token
 * somewhere (CORS runs `credentials: false`, so cookies are not an option).
 */
interface SessionState {
  token: string | null;
  setToken: (token: string) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => set({ token }),
      clearSession: () => set({ token: null }),
    }),
    {
      name: 'storefront-session',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token }),
    },
  ),
);

/** Read the token outside React — the API client needs it per request, not per render. */
export function getSessionToken(): string | null {
  return useSessionStore.getState().token;
}
