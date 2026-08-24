import { Star } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';

import { LoadingStatus } from '@/components/busy-indicator';
import { EmptyState, ErrorState } from '@/components/error-state';
import { PaginationControls } from '@/components/pagination-controls';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyReviews } from '@/features/reviews/api';
import { RatingStars } from '@/features/reviews/components/rating-stars';
import { formatCount } from '@/lib/format';
import { useDocumentTitle } from '@/lib/use-document-title';

export default function MyReviewsPage() {
  useDocumentTitle('Your reviews');

  const [searchParams, setSearchParams] = useSearchParams();
  const rawPage = Number(searchParams.get('page'));
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.trunc(rawPage) : 1;

  const query = useMyReviews({ page });

  const setPage = (next: number) =>
    setSearchParams((current) => {
      const params = new URLSearchParams(current);
      if (next <= 1) params.delete('page');
      else params.set('page', String(next));
      return params;
    });

  if (query.isPending) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-44" />
        <LoadingStatus label="Loading your reviews…">
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </LoadingStatus>
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        title="Could not load your reviews"
        onRetry={() => void query.refetch()}
      />
    );
  }

  const { reviews, pagination } = query.data;

  if (reviews.length === 0 && pagination.total === 0) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-semibold tracking-tight">Your reviews</h1>
        <EmptyState
          title="You have not reviewed anything yet"
          description="You can review any product you have ordered."
        >
          <Button asChild>
            <Link to="/orders">See your orders</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-semibold tracking-tight">Your reviews</h1>
        <EmptyState
          title="That page is past the end of your reviews"
          description={`You have written ${formatCount(pagination.total)} review${
            pagination.total === 1 ? '' : 's'
          }.`}
        >
          <Button variant="outline" onClick={() => setPage(1)}>
            Go to the first page
          </Button>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Your reviews</h1>

      <ul className="space-y-4" aria-busy={query.isFetching}>
        {reviews.map((review) => (
          <li key={review._id} className="rounded-lg border p-4">
            <div className="flex flex-wrap items-start gap-4">
              {/* `productId` is populated here with title and image, which is what makes the
                  link back possible without a second request per row. */}
              {/* Decorative — the title and the "View product" button both link here. */}
              <Link
                to={`/products/${review.productId._id}`}
                aria-hidden
                tabIndex={-1}
                className="shrink-0"
              >
                <img
                  src={review.productId.imageURL}
                  alt=""
                  className="size-16 rounded-md bg-muted object-cover"
                />
              </Link>

              <div className="min-w-0 flex-1 space-y-1">
                <Link
                  to={`/products/${review.productId._id}`}
                  className="font-medium hover:underline"
                >
                  {review.productId.title}
                </Link>

                <div className="flex flex-wrap items-center gap-2">
                  <RatingStars value={review.rating} />
                  <span className="text-sm font-medium">{review.rating}/5</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {review.title && <p className="font-medium">{review.title}</p>}
                <p className="text-sm text-muted-foreground">{review.comment}</p>
              </div>

              <Button asChild variant="outline" size="sm">
                <Link to={`/products/${review.productId._id}`}>
                  <Star aria-hidden />
                  View product
                </Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <PaginationControls
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onPageChange={setPage}
        label="Reviews"
      />
    </div>
  );
}
