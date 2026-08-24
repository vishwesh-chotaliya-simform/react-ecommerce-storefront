import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { BusyIndicator, LoadingStatus } from '@/components/busy-indicator';
import { EmptyState, ErrorState } from '@/components/error-state';
import { PaginationControls } from '@/components/pagination-controls';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { formatCount } from '@/lib/format';

import { useSession } from '@/features/auth/use-session';
import { errorMessage } from '@/lib/error-message';

import { useDeleteReview, useProductReviews } from '../api';
import type { Review, ReviewRating, ReviewSort } from '../types';
import { RatingStars } from './rating-stars';
import { ReviewForm } from './review-form';

const SORT_LABELS: Record<ReviewSort, string> = {
  newest: 'Newest first',
  rating_high: 'Highest rated',
  rating_low: 'Lowest rated',
};

const RATINGS: ReviewRating[] = [5, 4, 3, 2, 1];
const ANY_RATING = 'any';

export interface ReviewListState {
  page: number;
  rating: ReviewRating | undefined;
  sortBy: ReviewSort;
  setPage: (page: number) => void;
  setRating: (rating: ReviewRating | undefined) => void;
  setSort: (sortBy: ReviewSort) => void;
}

export function ReviewList({ productId, state }: { productId: string; state: ReviewListState }) {
  const query = useProductReviews(productId, {
    page: state.page,
    ...(state.rating !== undefined ? { rating: state.rating } : {}),
    sortBy: state.sortBy,
  });

  return (
    <section className="space-y-6" aria-labelledby="reviews-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="reviews-heading" className="text-lg font-semibold">
          Reviews
        </h2>

        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-2">
            <Label htmlFor="review-rating">Rating</Label>
            <Select
              value={state.rating === undefined ? ANY_RATING : String(state.rating)}
              onValueChange={(value) =>
                state.setRating(value === ANY_RATING ? undefined : (Number(value) as ReviewRating))
              }
            >
              <SelectTrigger id="review-rating" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_RATING}>Any rating</SelectItem>
                {RATINGS.map((rating) => (
                  <SelectItem key={rating} value={String(rating)}>
                    {rating} star{rating === 1 ? '' : 's'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="review-sort">Sort</Label>
            <Select
              value={state.sortBy}
              onValueChange={(value) => state.setSort(value as ReviewSort)}
            >
              <SelectTrigger id="review-sort" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SORT_LABELS) as ReviewSort[]).map((option) => (
                  <SelectItem key={option} value={option}>
                    {SORT_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {query.isPending ? (
        <ReviewListSkeleton />
      ) : query.isError ? (
        <ErrorState
          error={query.error}
          title="Could not load reviews"
          onRetry={() => void query.refetch()}
        />
      ) : query.data.reviews.length === 0 &&
        query.data.pagination.total > 0 &&
        query.data.pagination.page > query.data.pagination.totalPages ? (
        // Claiming "no reviews yet" on a product with reviews is simply false — this page is
        // just past the end of them.
        <EmptyState
          title="That page is past the end of the reviews"
          description={`There ${query.data.pagination.total === 1 ? 'is' : 'are'} ${formatCount(
            query.data.pagination.total,
          )} review${query.data.pagination.total === 1 ? '' : 's'} to read.`}
        >
          <Button variant="outline" size="sm" onClick={() => state.setPage(1)}>
            Go to the first page
          </Button>
        </EmptyState>
      ) : query.data.reviews.length === 0 ? (
        <EmptyState
          title={state.rating === undefined ? 'No reviews yet' : `No ${state.rating}-star reviews`}
          description={
            state.rating === undefined
              ? 'Be the first to review this product after buying it.'
              : 'Try a different rating filter.'
          }
        >
          {state.rating !== undefined && (
            <Button variant="outline" size="sm" onClick={() => state.setRating(undefined)}>
              Show all ratings
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="space-y-6" aria-busy={query.isFetching}>
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Showing {formatCount(query.data.reviews.length)} of{' '}
              {formatCount(query.data.pagination.total)}
            </p>
            {query.isFetching && <BusyIndicator />}
          </div>

          <ul className="space-y-4">
            {query.data.reviews.map((review) => (
              <ReviewRow key={review._id} productId={productId} review={review} />
            ))}
          </ul>

          <PaginationControls
            page={query.data.pagination.page}
            totalPages={query.data.pagination.totalPages}
            total={query.data.pagination.total}
            onPageChange={state.setPage}
            label="Reviews"
          />
        </div>
      )}
    </section>
  );
}

/**
 * One review, plus the owner's controls when it is theirs.
 *
 * Ownership is decided by comparing the populated author id with the signed-in user, so a
 * signed-out visitor and anyone reading somebody else's review simply never see the buttons.
 */
function ReviewRow({ productId, review }: { productId: string; review: Review }) {
  const { user } = useSession();
  const remove = useDeleteReview();
  const [isEditing, setIsEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isMine = user?._id === review.userId._id;

  if (isEditing) {
    return (
      <li className="space-y-3 rounded-lg border p-4">
        <p className="text-sm font-medium">Edit your review</p>
        <ReviewForm
          productId={productId}
          review={review}
          onDone={() => setIsEditing(false)}
          onCancel={() => setIsEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="space-y-2 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <RatingStars value={review.rating} />
        <span className="text-sm font-medium">{review.rating}/5</span>
        <span className="text-sm text-muted-foreground">
          · {isMine ? 'You' : review.userId.name}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          {new Date(review.createdAt).toLocaleDateString()}
        </span>
      </div>

      {review.title && <p className="font-medium">{review.title}</p>}
      <p className="text-sm text-muted-foreground">{review.comment}</p>

      {isMine && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil aria-hidden />
            Edit
          </Button>

          {confirmingDelete ? (
            <>
              <span className="text-sm text-muted-foreground">Delete this review?</span>
              <Button
                variant="destructive"
                size="sm"
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate(
                    { productId, reviewId: review._id },
                    { onSettled: () => setConfirmingDelete(false) },
                  )
                }
              >
                {remove.isPending ? 'Deleting…' : 'Yes, delete'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(true)}>
              <Trash2 aria-hidden />
              Delete
            </Button>
          )}
        </div>
      )}

      {remove.isError && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(remove.error)}
        </p>
      )}
    </li>
  );
}

function ReviewListSkeleton() {
  return (
    <LoadingStatus label="Loading reviews…">
      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="space-y-2 rounded-lg border p-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </LoadingStatus>
  );
}
