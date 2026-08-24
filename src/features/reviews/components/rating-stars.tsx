import { Star } from 'lucide-react';

import { cn } from '@/lib/utils';

interface RatingStarsProps {
  /** 0–5, fractional allowed — `avgRating` is rounded to one decimal server-side. */
  value: number;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Five stars filled to `value`. The number itself is always rendered alongside by callers —
 * stars alone are hard to read precisely, and screen readers get the text.
 */
export function RatingStars({ value, className, size = 'sm' }: RatingStarsProps) {
  const dimension = size === 'md' ? 'size-5' : 'size-4';

  return (
    <span className={cn('flex items-center gap-0.5', className)} aria-hidden>
      {[1, 2, 3, 4, 5].map((position) => {
        const fill = Math.max(0, Math.min(1, value - position + 1));

        return (
          <span key={position} className="relative inline-flex">
            <Star className={cn(dimension, 'text-muted-foreground/40')} />
            {fill > 0 && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${String(fill * 100)}%` }}
              >
                <Star className={cn(dimension, 'fill-amber-400 text-amber-400')} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
