import { http } from 'msw';

import { CUSTOMER, KEYBOARD, MOUSE, cartWith } from './fixtures';
import { ok } from './envelope';

/**
 * Default handlers: the happy path for everything the components under test touch.
 *
 * Anything a test needs to go wrong is overridden per-test with `server.use(...)`, so the
 * failure being exercised is visible in the test rather than buried in shared setup.
 */
export const handlers = [
  http.get('/api/users/me', () => ok(CUSTOMER, 'Current user fetched successfully')),
  http.get('/api/cart', () => ok(cartWith([KEYBOARD, 2], [MOUSE, 1]), 'Cart fetched successfully')),
  http.patch('/api/cart/:productId', () => ok(null, 'Cart item updated successfully')),
  http.delete('/api/cart/:productId', () => ok(null, 'Item removed from cart successfully')),
  http.post('/api/cart', () => ok(null, 'Item added to cart successfully')),
  http.delete('/api/cart', () => ok([], 'Cart cleared successfully')),
];
