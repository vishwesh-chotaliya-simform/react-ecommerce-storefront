import { MAX_ORDER_PAGE_SIZE, useOrders } from '@/features/orders/api';

import { useMyReviews } from './api';

/**
 * Whether the signed-in user may review a given product.
 *
 * There is no `canReview` flag, so this is derived: a product is reviewable when it appears in
 * one of my orders and does not already have a live review of mine. Both hooks are the
 * feature's own, asked for the server's maximum page size — this needs a complete picture,
 * not the first page of one.
 *
 * **This answer is a hint, not a gate.** It can be stale (a review written in another tab) and
 * it is incomplete past 100 orders or 100 reviews. The server decides, and callers must still
 * handle its 403 and 409 as real outcomes — see `isNotPurchased` and `isAlreadyReviewed`.
 */
export function useReviewEligibility(productId: string) {
  const orders = useOrders({ page: 1, limit: MAX_ORDER_PAGE_SIZE });
  const myReviews = useMyReviews({ page: 1, limit: MAX_ORDER_PAGE_SIZE });

  // Both hooks are disabled while signed out, and a disabled query stays `pending` forever —
  // so lean on `isFetching` rather than treating "never asked" as "still loading".
  const isLoading = orders.isFetching || myReviews.isFetching;

  const hasOrdered = Boolean(
    orders.data?.orders.some((order) => order.items.some((item) => item.product === productId)),
  );

  const existing = myReviews.data?.reviews.find((review) => review.productId._id === productId);

  return {
    isLoading,
    /** Ordered, and no live review of mine yet. */
    canReview: hasOrdered && existing === undefined,
    hasOrdered,
    /** My existing review of this product, if there is one. */
    myReview: existing,
  };
}
