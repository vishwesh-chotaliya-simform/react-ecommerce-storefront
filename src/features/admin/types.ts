import type { paths } from '@/lib/api-types';

type Json<T> = { content: { 'application/json': T } };
type Body<T> = T extends { requestBody?: Json<infer B> } ? B : never;

type AdminProductListData =
  paths['/admin/products']['get']['responses'][200]['content']['application/json']['data'];

/**
 * A product as the admin list returns it.
 *
 * Deliberately not the catalog's `Product`: the storefront endpoint strips `userId` and
 * `isDeleted` with a projection, while this one hands back the raw document. Sharing one type
 * across both would either invent fields the catalog never sends or hide fields the admin
 * screens legitimately need.
 */
export type AdminProduct = AdminProductListData['products'][number];

export type AdminProductListResult = AdminProductListData;

/** The server honours `title` and ignores everything else, falling back to newest first. */
export type AdminSortBy = 'title' | 'date';
export type SortOrder = 'asc' | 'desc';

export interface AdminProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: AdminSortBy;
  sortOrder?: SortOrder;
}

export type CreateProductBody = Body<paths['/admin/products']['post']>;
export type UpdateProductBody = Body<paths['/admin/products/{id}']['put']>;
