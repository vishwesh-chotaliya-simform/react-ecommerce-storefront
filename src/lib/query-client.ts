import { QueryClient } from '@tanstack/react-query';

import { ApiError } from './api-error';

const MAX_RETRIES = 2;

/**
 * Retry transport failures, never client errors.
 *
 * A 400 for a bad filter combination or a 403 on an unpurchased product is a verdict, not a
 * blip — retrying it three times just delays showing the user the message the server already
 * wrote for them.
 */
function retryUnlessClientError(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.isClientError) return false;
  return failureCount < MAX_RETRIES;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: retryUnlessClientError,
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Mutations are not idempotent here — `POST /cart` *adds to* the existing quantity and
      // `POST /orders` places a real order. A silent retry would double them.
      retry: false,
    },
  },
});
