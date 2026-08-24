import { Link } from 'react-router';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { RatingStars } from '@/features/reviews/components/rating-stars';
import { formatCount, formatPrice } from '@/lib/format';

import { usePrefetchProduct } from '../api';
import type { Product } from '../types';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const prefetch = usePrefetchProduct();

  const outOfStock = product.stock === 0;
  const lowStock = !outOfStock && product.stock <= 5;

  return (
    <Card className="h-full overflow-hidden pt-0 transition-shadow hover:shadow-md">
      {/* Hovering warms the detail query, so the click usually lands on cached data.
          `prefetchQuery` skips the request when the entry is already fresh. */}
      <Link
        to={`/products/${product._id}`}
        onMouseEnter={() => prefetch(product._id)}
        onFocus={() => prefetch(product._id)}
        className="flex h-full flex-col rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={product.imageURL}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
          {outOfStock && (
            <Badge variant="destructive" className="absolute top-3 right-3">
              Out of stock
            </Badge>
          )}
          {lowStock && (
            <Badge variant="secondary" className="absolute top-3 right-3">
              Only {product.stock} left
            </Badge>
          )}
        </div>

        <CardContent className="mt-6 space-y-1.5">
          <h3 className="leading-snug font-medium">{product.title}</h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        </CardContent>

        <CardFooter className="mt-auto items-center justify-between pt-6">
          <span className="text-lg font-semibold">{formatPrice(product.price)}</span>
          <Rating value={product.avgRating} count={product.reviewCount} />
        </CardFooter>
      </Link>
    </Card>
  );
}

function Rating({ value, count }: { value: number; count: number }) {
  if (count === 0) {
    return <span className="text-xs text-muted-foreground">No reviews yet</span>;
  }

  return (
    <span className="flex items-center gap-1 text-sm text-muted-foreground">
      <RatingStars value={value} />
      <span className="font-medium text-foreground">{value.toFixed(1)}</span>
      <span className="text-xs">({formatCount(count)})</span>
    </span>
  );
}
