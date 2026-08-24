import { useTransition } from 'react';
import { useSearchParams } from 'react-router';

import type { ProductListParams, ProductSortBy, SortOrder } from './types';

/**
 * Catalog filters, read from and written to the query string.
 *
 * The URL is the state, not a mirror of it — there is no `useState` copy to drift out of
 * sync. That is what makes a filtered view shareable: paste the address bar anywhere and the
 * same request goes out, because the address bar is the only input the hook has.
 */

const SORT_FIELDS: readonly ProductSortBy[] = ['title', 'price', 'date'];
const SORT_ORDERS: readonly SortOrder[] = ['asc', 'desc'];

/** Everything except `page` — changing any of these has to send you back to page 1. */
const FILTER_KEYS = ['search', 'sortBy', 'sortOrder', 'minPrice', 'maxPrice'] as const;

export type CatalogFilterKey = (typeof FILTER_KEYS)[number];

function readNumber(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key);
  if (raw === null || raw.trim() === '') return undefined;

  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

function readEnum<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
): T | undefined {
  const raw = params.get(key);
  return allowed.find((option) => option === raw);
}

export interface CatalogParams extends ProductListParams {
  page: number;
}

export interface UseCatalogParams {
  /** Filters as the query hook wants them. */
  params: CatalogParams;
  /** True while exactly one price bound is set — the API rejects that pair. */
  hasIncompletePriceRange: boolean;
  /** True when anything other than the default view is applied. */
  hasActiveFilters: boolean;
  /** Set one filter. Always returns to page 1. */
  setFilter: (key: CatalogFilterKey, value: string | number | undefined) => void;
  /** Set both price bounds together, or clear both. */
  setPriceRange: (min: number | undefined, max: number | undefined) => void;
  /** Set field and direction as one change — one history entry, one refetch. */
  setSortSelection: (sortBy: string, sortOrder: string) => void;
  setPage: (page: number) => void;
  clearFilters: () => void;
  /** True while a filter change is being applied without blocking input. */
  isPending: boolean;
}

/**
 * No `useMemo`/`useCallback` below: the React Compiler memoizes the derived params object and
 * every handler here. Hand-written memoization it would only redo is noise — and a stale
 * dependency array is a bug the compiler cannot have.
 */
export function useCatalogParams(): UseCatalogParams {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Built by assignment rather than conditional spreads: under `exactOptionalPropertyTypes`
  // an absent filter has to be a missing key, not a key holding `undefined`, and those two
  // are the same object at runtime but not to the query-key factory.
  // `page` is an index, not a measurement: `?page=1.5` was being forwarded verbatim and only
  // worked because the server happened to truncate it.
  const rawPage = readNumber(searchParams, 'page');
  const params: CatalogParams = {
    page: rawPage !== undefined && rawPage >= 1 ? Math.trunc(rawPage) : 1,
  };

  const search = searchParams.get('search')?.trim();
  if (search) params.search = search;

  const sortBy = readEnum(searchParams, 'sortBy', SORT_FIELDS);
  if (sortBy) params.sortBy = sortBy;

  const sortOrder = readEnum(searchParams, 'sortOrder', SORT_ORDERS);
  if (sortOrder) params.sortOrder = sortOrder;

  const minPriceParam = readNumber(searchParams, 'minPrice');
  if (minPriceParam !== undefined) params.minPrice = minPriceParam;

  const maxPriceParam = readNumber(searchParams, 'maxPrice');
  if (maxPriceParam !== undefined) params.maxPrice = maxPriceParam;

  /**
   * Rewrite the query string.
   *
   * Every write is a history push, so Back steps through filter changes one at a time. The
   * search box is what makes that bearable — it debounces, so a typed word is one entry, not
   * one per keystroke.
   */
  const update = (mutate: (next: URLSearchParams) => void) => {
    startTransition(() => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          mutate(next);
          return next;
        },
        { replace: false },
      );
    });
  };

  const setFilter: UseCatalogParams['setFilter'] = (key, value) => {
    update((next) => {
      if (value === undefined || value === '') next.delete(key);
      else next.set(key, String(value));

      // Page 4 of the old result set is meaningless against the new one — and often past its
      // last page, which would show an empty grid on a filter that has matches.
      next.delete('page');
    });
  };

  const setPriceRange: UseCatalogParams['setPriceRange'] = (min, max) => {
    update((next) => {
      if (min === undefined) next.delete('minPrice');
      else next.set('minPrice', String(min));

      if (max === undefined) next.delete('maxPrice');
      else next.set('maxPrice', String(max));

      next.delete('page');
    });
  };

  const setSortSelection: UseCatalogParams['setSortSelection'] = (nextSortBy, nextSortOrder) => {
    update((next) => {
      const field = SORT_FIELDS.find((option) => option === nextSortBy);
      const order = SORT_ORDERS.find((option) => option === nextSortOrder);

      if (field) next.set('sortBy', field);
      else next.delete('sortBy');

      if (order) next.set('sortOrder', order);
      else next.delete('sortOrder');

      next.delete('page');
    });
  };

  const setPage: UseCatalogParams['setPage'] = (page) => {
    update((next) => {
      if (page <= 1) next.delete('page');
      else next.set('page', String(page));
    });
  };

  const clearFilters = () => {
    update((next) => {
      for (const key of FILTER_KEYS) next.delete(key);
      next.delete('page');
    });
  };

  const { minPrice, maxPrice } = params;

  return {
    params,
    hasIncompletePriceRange: (minPrice === undefined) !== (maxPrice === undefined),
    hasActiveFilters: FILTER_KEYS.some((key) => searchParams.get(key)),
    setFilter,
    setPriceRange,
    setSortSelection,
    setPage,
    clearFilters,
    isPending,
  };
}
