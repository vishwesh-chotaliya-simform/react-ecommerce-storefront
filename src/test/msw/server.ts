import { setupServer } from 'msw/node';

import { handlers } from './handlers';

/**
 * Tests run against the network boundary.
 *
 * Components call the real `api-client`, which builds real requests that MSW intercepts —
 * so the envelope unwrapping, the `ApiError` parsing, and the query cache are all exercised,
 * not stubbed past.
 */
export const server = setupServer(...handlers);
