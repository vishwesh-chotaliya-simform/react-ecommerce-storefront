import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, apiPath, type QueryParams } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

import type { Product, ProductListParams, ProductListResult } from './types';

/**
 * Two rows of the four-column grid.
 *
 * Kept below the seeded catalog size on purpose: at 12-per-page the 12-product catalog is a
 * single page, so the pagination controls never render and server paging goes unexercised in
 * the one environment anybody actually runs this against.
 */
export const DEFAULT_PAGE_SIZE = 8;

/**
 * Reduce filters to what the API will actually be asked for.
 *
 * This runs *before* the query key is built, and that ordering is the point. A price bound on
 * its own is a 400 (`minPrice and maxPrice must be provided together`), so a half-filled range
 * has to be dropped — and because it is dropped before keying, typing a minimum with no
 * maximum yields the key the grid is already showing. React Query then has nothing new to
 * fetch, so the half-filled range fires no request at all rather than a doomed one.
 */
export function normalizeProductParams(params: ProductListParams): ProductListParams {
  const { page, limit, search, sortBy, sortOrder, minPrice, maxPrice } = params;
  const hasBothBounds = minPrice !== undefined && maxPrice !== undefined;
  const trimmedSearch = search?.trim();

  return {
    page: page ?? 1,
    limit: limit ?? DEFAULT_PAGE_SIZE,
    ...(trimmedSearch ? { search: trimmedSearch } : {}),
    ...(sortBy ? { sortBy } : {}),
    ...(sortOrder ? { sortOrder } : {}),
    ...(hasBothBounds ? { minPrice, maxPrice } : {}),
  };
}

function toQueryParams(params: ProductListParams): QueryParams {
  return { ...params };
}

export function fetchProducts(
  params: ProductListParams,
  signal?: AbortSignal,
): Promise<ProductListResult> {
  return api.get<ProductListResult>('/products', {
    searchParams: toQueryParams(params),
    // The catalog is public — no token needed, and sending one changes nothing.
    auth: false,
    ...(signal ? { signal } : {}),
  });
}

export function useProducts(params: ProductListParams = {}) {
  const resolved = normalizeProductParams(params);

  return useQuery({
    queryKey: queryKeys.products.list(resolved),
    queryFn: ({ signal }) => fetchProducts(resolved, signal),
    // Keeps the previous page on screen while the next one loads, instead of flashing the
    // whole grid back to skeletons on every page change.
    placeholderData: keepPreviousData,
  });
}

export function fetchProduct(productId: string, signal?: AbortSignal): Promise<Product> {
  return api.get<Product>(apiPath`/products/${productId}`, {
    auth: false,
    ...(signal ? { signal } : {}),
  });
}

export function useProduct(productId: string) {
  return useQuery({
    queryKey: queryKeys.products.detail(productId),
    queryFn: ({ signal }) => fetchProduct(productId, signal),
    enabled: productId.length > 0,
  });
}

/**
 * Warm a product's detail query while the pointer is still on its card.
 *
 * `prefetchQuery` is a no-op when the entry is already cached and fresh, so hovering a grid
 * repeatedly costs one request per product, not one per hover.
 */
export function usePrefetchProduct() {
  const queryClient = useQueryClient();

  return (productId: string) =>
    void queryClient.prefetchQuery({
      queryKey: queryKeys.products.detail(productId),
      queryFn: ({ signal }) => fetchProduct(productId, signal),
    });
}
