import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router';

import { useSessionStore } from '@/features/auth/session-store';

/**
 * A fresh client per test.
 *
 * Retries off so a deliberate failure fails once instead of three times, and `staleTime: 0`
 * so a test that expects a refetch gets one.
 *
 * `gcTime: Infinity` matters more than it looks: with a zero collection time, data seeded
 * through `setQueryData` is collected the moment it has no observer — and mutation hooks do
 * not observe the queries they write to, so the cache was empty before the assertion ran.
 * Each test builds its own client, so nothing leaks between them regardless.
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

interface Options extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  queryClient?: QueryClient;
  /** Seeds the persisted session so components behave as if signed in. */
  token?: string | null;
}

export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const { route = '/', queryClient = createTestQueryClient(), token = null, ...rest } = options;

  if (token) useSessionStore.setState({ token });
  else useSessionStore.setState({ token: null });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }

  return { queryClient, ...render(ui, { wrapper: Wrapper, ...rest }) };
}
