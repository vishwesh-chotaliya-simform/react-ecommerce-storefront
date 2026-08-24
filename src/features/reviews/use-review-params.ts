import { useSearchParams } from 'react-router';

import type { ReviewListState } from './components/review-list';
import type { ReviewRating, ReviewSort } from './types';

const SORTS: readonly ReviewSort[] = ['newest', 'rating_high', 'rating_low'];

/**
 * Review list state, kept in the query string like the catalog's filters.
 *
 * Prefixed keys (`reviewPage`, not `page`) because the detail page may grow other paged
 * sections later, and because a bare `page` would read as the catalog's own.
 *
 * No `useMemo`/`useCallback`: the React Compiler memoizes the derived state and these
 * handlers, and hand-written memoization it would only redo is noise that has to be kept
 * correct by hand.
 */
export function useReviewParams(): ReviewListState {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawPage = Number(searchParams.get('reviewPage'));
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.trunc(rawPage) : 1;

  const rawRating = Number(searchParams.get('rating'));
  const rating =
    Number.isInteger(rawRating) && rawRating >= 1 && rawRating <= 5
      ? (rawRating as ReviewRating)
      : undefined;

  const sortBy = SORTS.find((option) => option === searchParams.get('reviewSort')) ?? 'newest';

  const update = (mutate: (next: URLSearchParams) => void) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      mutate(next);
      return next;
    });
  };

  const setPage = (nextPage: number) => {
    update((next) => {
      if (nextPage <= 1) next.delete('reviewPage');
      else next.set('reviewPage', String(nextPage));
    });
  };

  const setRating = (nextRating: ReviewRating | undefined) => {
    update((next) => {
      if (nextRating === undefined) next.delete('rating');
      else next.set('rating', String(nextRating));
      // Same rule as the catalog: a narrower filter invalidates the page you were on.
      next.delete('reviewPage');
    });
  };

  const setSort = (nextSort: ReviewSort) => {
    update((next) => {
      if (nextSort === 'newest') next.delete('reviewSort');
      else next.set('reviewSort', nextSort);
      next.delete('reviewPage');
    });
  };

  return { page, rating, sortBy, setPage, setRating, setSort };
}
