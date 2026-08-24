import { Star } from 'lucide-react';

import { cn } from '@/lib/utils';

interface StarInputProps {
  value: number | undefined;
  onChange: (rating: number) => void;
  disabled?: boolean;
  name?: string;
}

const RATINGS = [1, 2, 3, 4, 5];

/**
 * A 1–5 star rating built on native radios.
 *
 * Radios rather than five buttons: the browser then gives arrow-key navigation, a single tab
 * stop for the group, and correct "3 of 5 selected" announcements for free. The stars are the
 * label; the input itself is visually hidden but still focusable, so the focus ring lands on
 * the star the user is on.
 */
export function StarInput({ value, onChange, disabled, name = 'rating' }: StarInputProps) {
  return (
    <fieldset disabled={disabled} className="flex items-center gap-1">
      <legend className="sr-only">Rating out of 5</legend>

      {RATINGS.map((rating) => {
        const id = `${name}-${String(rating)}`;
        const filled = value !== undefined && rating <= value;

        return (
          <span key={rating} className="relative">
            <input
              type="radio"
              id={id}
              name={name}
              value={rating}
              checked={value === rating}
              onChange={() => onChange(rating)}
              className="peer absolute inset-0 size-full cursor-pointer opacity-0"
            />
            <label
              htmlFor={id}
              className="block cursor-pointer rounded peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
            >
              <span className="sr-only">
                {rating} star{rating === 1 ? '' : 's'}
              </span>
              <Star
                aria-hidden
                className={cn(
                  'size-7 transition-colors',
                  filled ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40',
                )}
              />
            </label>
          </span>
        );
      })}
    </fieldset>
  );
}
