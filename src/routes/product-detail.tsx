import { ArrowLeft } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';

import { LoadingStatus } from '@/components/busy-indicator';
import { ErrorState } from '@/components/error-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { AddToCartButton } from '@/features/cart/components/add-to-cart-button';
import { useProduct } from '@/features/catalog/api';
import { RatingStars } from '@/features/reviews/components/rating-stars';
import { ReviewList } from '@/features/reviews/components/review-list';
import { WriteReview } from '@/features/reviews/components/write-review';
import { useReviewParams } from '@/features/reviews/use-review-params';
import { formatCount, formatPrice } from '@/lib/format';
import { useDocumentTitle } from '@/lib/use-document-title';

export default function ProductDetailPage() {
  const { productId = '' } = useParams();
  const query = useProduct(productId);
  const reviewState = useReviewParams();
  const navigate = useNavigate();
  const location = useLocation();

  useDocumentTitle(query.data?.title);

  // `key` is 'default' only for an entry the router did not push — a cold load or a pasted
  // link. Anything else means there is app history to step back into, and stepping back is
  // the only way to land on the catalog with the filters the user arrived with; a plain
  // `<Link to="/">` drops their search, sort, and page every time.
  const cameFromInsideApp = location.key !== 'default';

  return (
    <div className="space-y-10">
      {cameFromInsideApp ? (
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => void navigate(-1)}>
          <ArrowLeft aria-hidden />
          Back to catalog
        </Button>
      ) : (
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/">
            <ArrowLeft aria-hidden />
            Back to catalog
          </Link>
        </Button>
      )}

      {query.isPending ? (
        <ProductDetailSkeleton />
      ) : query.isError ? (
        // `Invalid product id` (400) and `Product not found` (404) are both written by the
        // server and both say exactly what went wrong — neither is worth replacing.
        <ErrorState
          error={query.error}
          title="This product could not be shown"
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <article className="grid gap-8 md:grid-cols-2">
            <div className="overflow-hidden rounded-xl bg-muted">
              <img
                src={query.data.imageURL}
                alt={query.data.title}
                className="aspect-square w-full object-cover"
              />
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">{query.data.title}</h1>
                <RatingSummary
                  avgRating={query.data.avgRating}
                  reviewCount={query.data.reviewCount}
                />
              </div>

              <p className="text-3xl font-semibold">{formatPrice(query.data.price)}</p>
              <p className="text-muted-foreground">{query.data.description}</p>

              <StockBadge stock={query.data.stock} />

              <AddToCartButton productId={query.data._id} stock={query.data.stock} />
            </div>
          </article>

          <Separator />

          <WriteReview productId={productId} />

          <ReviewList productId={productId} state={reviewState} />
        </>
      )}
    </div>
  );
}

function RatingSummary({ avgRating, reviewCount }: { avgRating: number; reviewCount: number }) {
  if (reviewCount === 0) {
    return <p className="text-sm text-muted-foreground">No reviews yet</p>;
  }

  return (
    <div className="flex items-center gap-2">
      <RatingStars value={avgRating} size="md" />
      <span className="font-medium">{avgRating.toFixed(1)}</span>
      <span className="text-sm text-muted-foreground">
        ({formatCount(reviewCount)} review{reviewCount === 1 ? '' : 's'})
      </span>
    </div>
  );
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <Badge variant="destructive">Out of stock</Badge>;
  if (stock <= 5) return <Badge variant="secondary">Only {stock} left</Badge>;

  return <p className="text-sm text-muted-foreground">{formatCount(stock)} in stock</p>;
}

function ProductDetailSkeleton() {
  return (
    <LoadingStatus label="Loading product…">
      <div className="grid gap-8 md:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </LoadingStatus>
  );
}
