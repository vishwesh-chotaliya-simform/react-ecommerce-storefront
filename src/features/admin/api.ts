import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/use-session';
import { api, apiPath, type QueryParams } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

import type {
  AdminProduct,
  AdminProductListParams,
  AdminProductListResult,
  CreateProductBody,
  UpdateProductBody,
} from './types';

export const DEFAULT_ADMIN_PAGE_SIZE = 10;

function toQueryParams(params: AdminProductListParams): QueryParams {
  const { search, ...rest } = params;
  const trimmed = search?.trim();

  return { ...rest, ...(trimmed ? { search: trimmed } : {}) };
}

/**
 * This admin's own products.
 *
 * Scoped server-side by `userId`, so a second admin account sees an empty list even against a
 * full catalog. Unlike the storefront list, `search` here matches description as well as
 * title, and only `sortBy=title` is honoured — anything else falls back to newest first.
 */
export function useAdminProducts(params: AdminProductListParams = {}) {
  const { isAdmin } = useSession();
  const resolved: AdminProductListParams = { page: 1, limit: DEFAULT_ADMIN_PAGE_SIZE, ...params };

  return useQuery({
    queryKey: queryKeys.adminProducts.list(resolved),
    queryFn: ({ signal }) =>
      api.get<AdminProductListResult>('/admin/products', {
        searchParams: toQueryParams(resolved),
        signal,
      }),
    enabled: isAdmin,
    placeholderData: keepPreviousData,
  });
}

/** One of this admin's products, for the edit form on a cold load. */
export function useAdminProduct(productId: string) {
  const { isAdmin } = useSession();

  return useQuery({
    queryKey: queryKeys.adminProducts.detail(productId),
    queryFn: ({ signal }) =>
      api.get<AdminProduct>(apiPath`/admin/products/${productId}`, { signal }),
    enabled: isAdmin && productId.length > 0,
  });
}

/**
 * Everything a write to a product invalidates.
 *
 * Two caches, not one. The admin table and the storefront catalog are different queries over
 * the same rows, so a create that only refreshed the admin list would leave the shop still
 * advertising the old set — and a delete would leave a product on sale that the admin has
 * already removed.
 */
function useAdminProductMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<unknown>,
  alsoInvalidate: readonly (readonly unknown[])[] = [],
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminProducts.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });

      for (const queryKey of alsoInvalidate) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}

export function useCreateProduct() {
  return useAdminProductMutation((body: CreateProductBody) =>
    api.post<AdminProduct>('/admin/products', body),
  );
}

export function useUpdateProduct() {
  return useAdminProductMutation(
    ({ productId, body }: { productId: string; body: UpdateProductBody }) =>
      // `PUT` with the whole object. The server's schema is `.partial()` and would accept a
      // fragment, but a PUT that replaces the resource should carry the resource.
      api.put<AdminProduct>(apiPath`/admin/products/${productId}`, body),
  );
}

/**
 * Soft-delete a product.
 *
 * The server flags `isDeleted` and then pulls the product from every customer's cart, so this
 * also invalidates the cart. There is no undo through the API — the confirmation in the UI is
 * the only chance to stop.
 */
export function useDeleteProduct() {
  return useAdminProductMutation(
    ({ productId }: { productId: string }) =>
      api.delete<AdminProduct>(apiPath`/admin/products/${productId}`),
    // The cascade reaches every customer's cart, including one this admin may have open.
    [queryKeys.cart.all],
  );
}
