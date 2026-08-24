import { useSearchParams } from 'react-router';

import type { AdminProductListParams, AdminSortBy, SortOrder } from './types';

/**
 * Admin table state, in the query string.
 *
 * `sortBy` offers only what the server honours. `sortBy=price` is *accepted* and silently
 * ignored — the list comes back ordered by `createdAt` instead — so offering a price sort
 * would produce a control that appears to work and does nothing.
 */
const SORT_FIELDS: readonly AdminSortBy[] = ['title', 'date'];
const SORT_ORDERS: readonly SortOrder[] = ['asc', 'desc'];

export interface UseAdminProductParams {
  params: AdminProductListParams & { page: number };
  hasFilters: boolean;
  setSearch: (value: string) => void;
  setSort: (sortBy: string, sortOrder: string) => void;
  setPage: (page: number) => void;
  clearFilters: () => void;
}

/**
 * No `useMemo`/`useCallback`: the React Compiler memoizes the derived params and handlers.
 */
export function useAdminProductParams(): UseAdminProductParams {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawPage = Number(searchParams.get('page'));
  const params: AdminProductListParams & { page: number } = {
    page: Number.isFinite(rawPage) && rawPage >= 1 ? Math.trunc(rawPage) : 1,
  };

  const search = searchParams.get('search')?.trim();
  if (search) params.search = search;

  const sortBy = SORT_FIELDS.find((option) => option === searchParams.get('sortBy'));
  if (sortBy) params.sortBy = sortBy;

  const sortOrder = SORT_ORDERS.find((option) => option === searchParams.get('sortOrder'));
  if (sortOrder) params.sortOrder = sortOrder;

  const update = (mutate: (next: URLSearchParams) => void) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      mutate(next);
      return next;
    });
  };

  const setSearch: UseAdminProductParams['setSearch'] = (value) => {
    update((next) => {
      if (value.trim()) next.set('search', value);
      else next.delete('search');
      // A narrower list invalidates the page you were on.
      next.delete('page');
    });
  };

  const setSort: UseAdminProductParams['setSort'] = (nextSortBy, nextSortOrder) => {
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

  const setPage: UseAdminProductParams['setPage'] = (page) => {
    update((next) => {
      if (page <= 1) next.delete('page');
      else next.set('page', String(page));
    });
  };

  const clearFilters = () => {
    update((next) => {
      next.delete('search');
      next.delete('sortBy');
      next.delete('sortOrder');
      next.delete('page');
    });
  };

  return {
    params,
    hasFilters: Boolean(searchParams.get('search')),
    setSearch,
    setSort,
    setPage,
    clearFilters,
  };
}
