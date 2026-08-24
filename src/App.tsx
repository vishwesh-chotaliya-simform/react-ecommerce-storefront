import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';

import { ErrorBoundary } from '@/components/error-boundary';
import { queryClient } from '@/lib/query-client';

import { AppRoutes } from './routes';

/**
 * Provider composition, outermost first:
 *
 * `ErrorBoundary` catches anything the route-level boundaries miss — including a crash in a
 * provider itself. `QueryClientProvider` sits above the router so the 401 handler can clear
 * the cache from outside React.
 */
export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
