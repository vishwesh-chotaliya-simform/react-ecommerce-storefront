import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/use-session';
import { api, apiPath } from '@/lib/api-client';
import { ApiError } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

import type { Order, OrderListParams, OrderListResult, PlaceOrderBody } from './types';

export const DEFAULT_ORDER_PAGE_SIZE = 5;

/**
 * The server caps `limit` at 100. Used where a complete picture matters more than a page —
 * see the review-eligibility cross-reference.
 */
export const MAX_ORDER_PAGE_SIZE = 100;

/** The server's wording when the transaction loses a race for the last units. */
const INSUFFICIENT_STOCK = 'Insufficient stock for';

export function isInsufficientStock(error: unknown): boolean {
  return error instanceof ApiError && error.message.startsWith(INSUFFICIENT_STOCK);
}

export function isEmptyCart(error: unknown): boolean {
  return error instanceof ApiError && error.message.startsWith('Cart is empty');
}

export function isMissingAddress(error: unknown): boolean {
  return error instanceof ApiError && error.message.startsWith('You have no saved addresses');
}

/**
 * Order history, newest first.
 *
 * The sort is the server's (`createdAt: -1`) and is not configurable, so there is nothing to
 * put in the URL beyond the page.
 */
export function useOrders(params: OrderListParams = {}) {
  const { isAuthenticated } = useSession();
  const resolved: OrderListParams = { page: 1, limit: DEFAULT_ORDER_PAGE_SIZE, ...params };

  return useQuery({
    queryKey: queryKeys.orders.list(resolved),
    queryFn: ({ signal }) =>
      api.get<OrderListResult>('/orders', { searchParams: { ...resolved }, signal }),
    // `/orders` is behind `authenticate`; asking before the session is confirmed only
    // produces a 401 that tears it down.
    enabled: isAuthenticated,
    placeholderData: keepPreviousData,
  });
}

/**
 * Read one order back.
 *
 * Placing an order seeds this key from the response, so the confirmation screen normally
 * renders without a request. This exists for the reload: the confirmation URL is shareable
 * and bookmarkable, and it should not be a blank page on a refresh.
 */
export function useOrder(orderId: string) {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: ({ signal }) => api.get<Order>(apiPath`/orders/${orderId}`, { signal }),
    enabled: orderId.length > 0,
  });
}

/**
 * Place the order.
 *
 * One `POST /orders` changes three things inside a transaction: the cart is emptied, an order
 * is created, and every ordered product's stock is decremented. All three have to be
 * invalidated — leaving `products` alone is how a catalog goes on advertising stock that has
 * already been sold, which is the quiet bug this screen is most likely to ship.
 */
export function usePlaceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: PlaceOrderBody) => api.post<Order>('/orders', body),

    onSuccess: (order) => {
      // The response is the whole order, so seeding this key means the confirmation renders
      // without a request — provided nothing below invalidates it again.
      queryClient.setQueryData(queryKeys.orders.detail(order._id), order);
    },

    onError: async (error) => {
      // Losing the stock race is the one failure where the cart the user is looking at is
      // already out of date. Awaited on purpose: TanStack flips the mutation to its error
      // state only after this resolves, so by the time the message appears the cart beneath
      // it already shows the stock that caused it.
      if (isInsufficientStock(error)) {
        await queryClient.refetchQueries({ queryKey: queryKeys.cart.all });
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
      // Only the history lists. `orders.all` would also match the detail this mutation just
      // seeded from the authoritative response, throwing it away and refetching it.
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
      // Stock moved. Every catalog list and product detail in the cache is now stale.
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      // The order may have been rejected *because* the address book changed underneath us —
      // without this the screen keeps offering an address the server says does not exist.
      void queryClient.invalidateQueries({ queryKey: queryKeys.addresses.all });
    },
  });
}
