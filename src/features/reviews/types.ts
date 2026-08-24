import type { paths } from '@/lib/api-types';

type Json<T> = { content: { 'application/json': T } };
type Body<T> = T extends { requestBody?: Json<infer B> } ? B : never;

type ReviewListData =
  paths['/products/{productId}/reviews']['get']['responses'][200]['content']['application/json']['data'];

/** One review. `userId` arrives populated with just the author's name. */
export type Review = ReviewListData['reviews'][number];

export type ReviewListResult = ReviewListData;

/** `newest` is the server's default, and also its fallback for an unrecognised value. */
export type ReviewSort = NonNullable<
  NonNullable<paths['/products/{productId}/reviews']['get']['parameters']['query']>['sortBy']
>;

/** Exact-match rating filter — the server compares `rating` for equality, not as a floor. */
export type ReviewRating = 1 | 2 | 3 | 4 | 5;

export interface ReviewListParams {
  page?: number;
  limit?: number;
  rating?: ReviewRating;
  sortBy?: ReviewSort;
}

type MyReviewListData =
  paths['/users/me/reviews']['get']['responses'][200]['content']['application/json']['data'];

/**
 * One of my own reviews.
 *
 * Shaped differently from {@link Review}: here `productId` is populated with the product's
 * title and image (so the list can link back), while `userId` is a bare id — the opposite of
 * the per-product list, which populates the author instead.
 */
export type MyReview = MyReviewListData['reviews'][number];
export type MyReviewListResult = MyReviewListData;

export interface MyReviewListParams {
  page?: number;
  limit?: number;
}

export type CreateReviewBody = Body<paths['/products/{productId}/reviews']['post']>;
export type UpdateReviewBody = Body<paths['/products/{productId}/reviews/{reviewId}']['patch']>;
