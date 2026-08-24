import { http } from 'msw';
import { describe, expect, it } from 'vitest';

import { fail, mongooseFail, ok, zodFail } from '@/test/msw/envelope';
import { server } from '@/test/msw/server';

import { api, apiPath } from './api-client';
import { ApiError } from './api-error';

/**
 * These go through the real client against MSW, so the envelope unwrapping and the error
 * parsing are exercised end to end rather than called directly. If a handler drifts from the
 * shape the backend sends, these are what notice.
 */
describe('api-client against the real envelope', () => {
  it('unwraps `data` so callers never see the envelope', async () => {
    server.use(http.get('/api/products', () => ok({ products: [], pagination: { total: 0 } })));

    await expect(api.get('/products')).resolves.toEqual({
      products: [],
      pagination: { total: 0 },
    });
  });

  it('turns a joined Zod rejection into per-field errors', async () => {
    server.use(
      http.post('/api/users/signup', () =>
        zodFail({
          email: 'Invalid email address',
          password: 'Password must be at least 8 characters long',
        }),
      ),
    );

    const error = await api.post('/users/signup', {}).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
    expect((error as ApiError).fields).toEqual({
      email: 'Invalid email address',
      password: 'Password must be at least 8 characters long',
    });
  });

  it('accepts the Mongoose shape, where `message` is an object keyed by field', async () => {
    server.use(
      http.post('/api/users/me/addresses', () =>
        mongooseFail({ pincode: 'Pincode must be a 6-digit number' }),
      ),
    );

    const error = (await api.post('/users/me/addresses', {}).catch((e: unknown) => e)) as ApiError;

    expect(error.fields).toEqual({ pincode: 'Pincode must be a 6-digit number' });
  });

  it('keeps a prose message whole and blames no field', async () => {
    server.use(
      http.post('/api/orders', () =>
        fail(400, 'Cart is empty. Add items before placing an order.'),
      ),
    );

    const error = (await api.post('/orders', {}).catch((e: unknown) => e)) as ApiError;

    expect(error.message).toBe('Cart is empty. Add items before placing an order.');
    expect(error.fields).toEqual({});
  });

  it('reports a 2xx it cannot parse instead of returning undefined', async () => {
    server.use(
      http.get(
        '/api/products',
        () =>
          // A dead proxy answering with HTML is a failure, not an empty success.
          new Response('<html>proxy</html>', {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
          }),
      ),
    );

    const error = (await api.get('/products').catch((e: unknown) => e)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toMatch(/could not read/i);
  });

  it('percent-encodes interpolated path segments', async () => {
    let seen = '';
    server.use(
      http.get('/api/products/:id', ({ params }) => {
        seen = String(params.id);
        return ok({ _id: seen });
      }),
    );

    await api.get(apiPath`/products/${'abc?page=9'}`);
    // Reaches the server as one segment rather than becoming a query string.
    expect(seen).toBe('abc?page=9');
  });
});
