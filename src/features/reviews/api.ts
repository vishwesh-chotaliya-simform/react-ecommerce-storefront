import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/use-session';
import { api, apiPath } from '@/lib/api-client';
import { ApiError } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

import type {
  CreateReviewBody,
  MyReviewListParams,
  MyReviewListResult,
  Review,
  ReviewListParams,
  ReviewListResult,
  UpdateReviewBody,
} from './types';

export const DEFAULT_REVIEW_PAGE_SIZE = 5;
export const DEFAULT_MY_REVIEW_PAGE_SIZE = 5;

/** 403 — the server found no order of this product for this user. */
export function isNotPurchased(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}

/** 409 — a live review already exists for this product/user pair. */
export function isAlreadyReviewed(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}

export function fetchProductReviews(
  productId: string,
  params: ReviewListParams,
  signal?: AbortSignal,
): Promise<ReviewListResult> {
  return api.get<ReviewListResult>(apiPath`/products/${productId}/reviews`, {
    searchParams: { ...params },
    // Reviews are public; a token changes nothing about what comes back.
    auth: false,
    ...(signal ? { signal } : {}),
  });
}

/**
 * A product's reviews, paginated, optionally filtered to one exact rating and sorted.
 *
 * Like the catalog grid, the previous page stays on screen while the next one loads — a
 * review list that collapses to skeletons on every page click reads as a much slower page
 * than it is.
 */
export function useProductReviews(productId: string, params: ReviewListParams = {}) {
  const resolved: ReviewListParams = { page: 1, limit: DEFAULT_REVIEW_PAGE_SIZE, ...params };

  return useQuery({
    queryKey: queryKeys.reviews.list(productId, resolved),
    queryFn: ({ signal }) => fetchProductReviews(productId, resolved, signal),
    enabled: productId.length > 0,
    placeholderData: keepPreviousData,
  });
}

/**
 * My own reviews, newest first.
 *
 * Note the shape: `productId` is populated here and `userId` is not — the mirror image of the
 * per-product list.
 */
export function useMyReviews(params: MyReviewListParams = {}) {
  const { isAuthenticated } = useSession();
  const resolved: MyReviewListParams = { page: 1, limit: DEFAULT_MY_REVIEW_PAGE_SIZE, ...params };

  return useQuery({
    queryKey: queryKeys.reviews.myList(resolved),
    queryFn: ({ signal }) =>
      api.get<MyReviewListResult>('/users/me/reviews', { searchParams: { ...resolved }, signal }),
    enabled: isAuthenticated,
    placeholderData: keepPreviousData,
  });
}

/**
 * Everything a write to a review invalidates.
 *
 * Three caches move, not one. The product's own `avgRating` and `reviewCount` are recomputed
 * server-side inside the same transaction, so leaving `products` alone would keep a detail
 * page — and every catalog card — quoting an average that no longer exists.
 */
function useReviewMutation<TVariables extends { productId: string }>(
  mutationFn: (variables: TVariables) => Promise<unknown>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.reviews.forProduct(variables.productId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews.mine() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

export function useCreateReview() {
  return useReviewMutation(({ productId, body }: { productId: string; body: CreateReviewBody }) =>
    api.post<Review>(apiPath`/products/${productId}/reviews`, body),
  );
}

export function useUpdateReview() {
  return useReviewMutation(
    ({
      productId,
      reviewId,
      body,
    }: {
      productId: string;
      reviewId: string;
      body: UpdateReviewBody;
    }) => api.patch<Review>(apiPath`/products/${productId}/reviews/${reviewId}`, body),
  );
}

/**
 * Delete a review.
 *
 * Soft on the server — the document is flagged rather than removed — and the unique index on
 * `(productId, userId)` is partial to `isDeleted: false`. So deleting frees the user to write
 * a fresh review of the same product, which is exactly what the UI should offer afterwards.
 */
export function useDeleteReview() {
  return useReviewMutation(({ productId, reviewId }: { productId: string; reviewId: string }) =>
    api.delete<Review>(apiPath`/products/${productId}/reviews/${reviewId}`),
  );
}
