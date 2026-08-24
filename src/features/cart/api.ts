import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/use-session';
import { api, apiPath } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

import type { AddToCartBody, CartItem } from './types';

/* ------------------------------------------------------------------- query */

/**
 * The cart, straight from the server.
 *
 * Every screen that shows cart state — the page, the header badge, the stepper — reads this
 * one query, which is what lets an optimistic update in one place move the number in all of
 * them at once.
 *
 * Gated on a *confirmed* session rather than a token: `/cart` is behind `authenticate`, and
 * firing it with a superseded token would only produce a 401 that tears the session down.
 */
export function useCart() {
  const { isAuthenticated } = useSession();

  return useQuery({
    queryKey: queryKeys.cart.all,
    queryFn: ({ signal }) => api.get<CartItem[]>('/cart', { signal }),
    enabled: isAuthenticated,
  });
}

/** Total units in the cart — what the header badge counts. */
export function cartItemCount(items: CartItem[] | undefined): number {
  return items?.reduce((total, item) => total + item.quantity, 0) ?? 0;
}

/**
 * Cart total, recomputed from the lines every time it is read.
 *
 * Deliberately not stored anywhere: a cached total is a second source of truth that goes
 * stale the moment a line changes, and the server does not send one to reconcile against.
 */
export function cartTotal(items: CartItem[] | undefined): number {
  return items?.reduce((total, item) => total + item.product.price * item.quantity, 0) ?? 0;
}

/* --------------------------------------------------------------- mutations */

interface CartMutationContext {
  previous: CartItem[] | undefined;
}

/**
 * The optimistic-write/rollback dance, in one place.
 *
 * The ordering is what makes it correct: cancel in-flight refetches first (otherwise a
 * response already on the wire lands on top of the optimistic value and undoes it), snapshot
 * before writing, undo on failure, and refetch either way — the cart endpoints all answer
 * `data: null`, so the server's version of the truth only arrives on the next `GET /cart`.
 *
 * `undo` deliberately receives the *current* list rather than replacing it with the snapshot.
 * Restoring the whole snapshot looks equivalent and is not: every line the user changed while
 * this request was in flight is inside that snapshot too, so a single failure would rewind
 * their other edits — reverting a quantity they successfully changed, or resurrecting a line
 * they successfully removed. Each mutation may only undo its own change.
 */
function useOptimisticCartMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<unknown>,
  applyOptimistically: (items: CartItem[], variables: TVariables) => CartItem[],
  undo: (current: CartItem[], variables: TVariables, snapshot: CartItem[]) => CartItem[],
) {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, TVariables, CartMutationContext>({
    mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.all });

      const previous = queryClient.getQueryData<CartItem[]>(queryKeys.cart.all);
      if (previous) {
        queryClient.setQueryData<CartItem[]>(
          queryKeys.cart.all,
          applyOptimistically(previous, variables),
        );
      }

      return { previous };
    },
    onError: (_error, variables, context) => {
      const snapshot = context?.previous;
      if (!snapshot) return;

      queryClient.setQueryData<CartItem[]>(queryKeys.cart.all, (current) =>
        undo(current ?? snapshot, variables, snapshot),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.cart.all }),
  });
}

/**
 * Add to the cart.
 *
 * `POST /cart` *adds to* whatever quantity is already there rather than setting it, so
 * sending the same request twice adds twice — callers must not let a second click through
 * while the first is in flight.
 *
 * No optimistic write: the response is `data: null` and a brand-new line has no product
 * details to invent, so this waits for the refetch instead of guessing.
 */
export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: AddToCartBody) => api.post<null>('/cart', body),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.cart.all }),
  });
}

/**
 * Set a line's quantity.
 *
 * `PATCH` sets, where `POST` adds. The server rejects a quantity of 0 outright
 * (`Quantity must be a positive integer`), so stepping the last unit away is a delete, not a
 * patch to zero — see {@link useRemoveCartItem}.
 */
export function useUpdateCartQuantity() {
  return useOptimisticCartMutation(
    ({ productId, quantity }: { productId: string; quantity: number }) =>
      api.patch<null>(apiPath`/cart/${productId}`, { quantity }),
    (items, { productId, quantity }) =>
      items.map((item) => (item.product._id === productId ? { ...item, quantity } : item)),
    // Put this one line back to the quantity it had, leaving every other line alone.
    (current, { productId }, snapshot) => {
      const before = snapshot.find((item) => item.product._id === productId);
      if (!before) return current;

      return current.map((item) =>
        item.product._id === productId ? { ...item, quantity: before.quantity } : item,
      );
    },
  );
}

export function useRemoveCartItem() {
  return useOptimisticCartMutation(
    ({ productId }: { productId: string }) => api.delete<null>(apiPath`/cart/${productId}`),
    (items, { productId }) => items.filter((item) => item.product._id !== productId),
    // Re-insert the removed line where it was, unless something already put it back.
    (current, { productId }, snapshot) => {
      if (current.some((item) => item.product._id === productId)) return current;

      const index = snapshot.findIndex((item) => item.product._id === productId);
      const removed = snapshot[index];
      if (!removed) return current;

      const restored = [...current];
      restored.splice(Math.min(index, restored.length), 0, removed);
      return restored;
    },
  );
}

export function useClearCart() {
  return useOptimisticCartMutation(
    // `DELETE /cart` answers with `data: []`, not `null` like the per-line endpoints.
    () => api.delete<CartItem[]>('/cart'),
    () => [],
    // Emptying touches every line, so its undo legitimately is the whole snapshot.
    (_current, _variables, snapshot) => snapshot,
  );
}
