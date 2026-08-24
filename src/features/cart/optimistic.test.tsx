import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, delay, http } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { queryKeys } from '@/lib/query-keys';
import { KEYBOARD, MOUSE, cartWith } from '@/test/msw/fixtures';
import { fail, ok } from '@/test/msw/envelope';
import { server } from '@/test/msw/server';
import { createTestQueryClient } from '@/test/render';

import type { CartItem } from './types';
import { useRemoveCartItem, useUpdateCartQuantity } from './api';

/**
 * The cart's refetch is frozen for these tests.
 *
 * Every cart mutation invalidates the cart on settle, so a passing assertion could just be
 * the refetch quietly repairing a broken rollback. Hanging `GET /api/cart` removes that
 * safety net, leaving the optimistic write and its undo as the only things that move the
 * cache — which is precisely what is under test.
 */
function freezeCartRefetch() {
  server.use(
    http.get('/api/cart', async () => {
      await delay('infinite');
      return HttpResponse.json({});
    }),
  );
}

function setup(initial: CartItem[]) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.cart.all, initial);
  freezeCartRefetch();

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const cart = () => queryClient.getQueryData<CartItem[]>(queryKeys.cart.all) ?? [];
  const quantityOf = (id: string) => cart().find((item) => item.product._id === id)?.quantity;

  return { queryClient, wrapper, cart, quantityOf };
}

describe('optimistic cart quantity', () => {
  it('moves the number before the request resolves', async () => {
    const { wrapper, quantityOf } = setup(cartWith([KEYBOARD, 2]));
    server.use(
      http.patch('/api/cart/:productId', async () => {
        await delay(200);
        return ok(null);
      }),
    );

    const { result } = renderHook(() => useUpdateCartQuantity(), { wrapper });

    act(() => {
      result.current.mutate({ productId: KEYBOARD._id, quantity: 5 });
    });

    // Written to the cache while the PATCH is still in flight.
    await waitFor(() => expect(quantityOf(KEYBOARD._id)).toBe(5));
    expect(result.current.isPending).toBe(true);
  });

  it('rolls the number back to its previous value when the server rejects', async () => {
    const { wrapper, quantityOf } = setup(cartWith([KEYBOARD, 2]));
    server.use(
      http.patch('/api/cart/:productId', () =>
        fail(400, 'Requested quantity exceeds available stock'),
      ),
    );

    const { result } = renderHook(() => useUpdateCartQuantity(), { wrapper });

    act(() => {
      result.current.mutate({ productId: KEYBOARD._id, quantity: 9999 });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(quantityOf(KEYBOARD._id)).toBe(2);
    expect(result.current.error?.message).toBe('Requested quantity exceeds available stock');
  });

  /**
   * The regression this suite exists for.
   *
   * Rolling back by restoring a whole-list snapshot looks equivalent and is not: the snapshot
   * also contains every other line as it was *before* this request started, so one failure
   * would rewind a concurrent edit the user made and the server accepted.
   */
  it('does not rewind another line that succeeded while it was in flight', async () => {
    const { wrapper, quantityOf } = setup(cartWith([KEYBOARD, 2], [MOUSE, 2]));

    server.use(
      http.patch('/api/cart/:productId', async ({ params }) => {
        if (params.productId === KEYBOARD._id) {
          await delay(150); // the doomed one resolves last
          return fail(400, 'Requested quantity exceeds available stock');
        }
        return ok(null);
      }),
    );

    // Two lines, two independent mutation instances — one per row, as the UI renders them.
    const { result } = renderHook(
      () => ({ keyboard: useUpdateCartQuantity(), mouse: useUpdateCartQuantity() }),
      { wrapper },
    );

    act(() => {
      result.current.keyboard.mutate({ productId: KEYBOARD._id, quantity: 3 });
      result.current.mouse.mutate({ productId: MOUSE._id, quantity: 3 });
    });

    await waitFor(() => expect(result.current.keyboard.isError).toBe(true));
    await waitFor(() => expect(result.current.mouse.isSuccess).toBe(true));

    expect(quantityOf(KEYBOARD._id)).toBe(2); // undone
    expect(quantityOf(MOUSE._id)).toBe(3); // survived
  });

  it('puts a removed line back where it was when the delete fails', async () => {
    const { wrapper, cart } = setup(cartWith([KEYBOARD, 2], [MOUSE, 1]));
    server.use(http.delete('/api/cart/:productId', () => fail(500, 'Internal server error')));

    const { result } = renderHook(() => useRemoveCartItem(), { wrapper });

    act(() => {
      result.current.mutate({ productId: KEYBOARD._id });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    // Restored, and at its original index rather than appended to the end.
    expect(cart().map((item) => item.product._id)).toEqual([KEYBOARD._id, MOUSE._id]);
  });
});
