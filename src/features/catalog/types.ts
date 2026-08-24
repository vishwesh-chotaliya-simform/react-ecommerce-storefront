import type { paths } from '@/lib/api-types';

type ProductListData =
  paths['/products']['get']['responses'][200]['content']['application/json']['data'];

/** A catalog product exactly as the API returns it. */
export type Product = ProductListData['products'][number];

/** Pagination block, nested beside the list rather than at the envelope root. */
export type Pagination = ProductListData['pagination'];

export interface ProductListResult {
  products: Product[];
  pagination: Pagination;
}

export type ProductSortBy = 'title' | 'price' | 'date';
export type SortOrder = 'asc' | 'desc';

/**
 * Catalog filters, as app code holds them — numbers stay numbers here and are stringified at
 * the request boundary.
 *
 * `minPrice` and `maxPrice` are only meaningful together; the API rejects one without the
 * other with a 400.
 */
export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: ProductSortBy;
  sortOrder?: SortOrder;
  minPrice?: number;
  maxPrice?: number;
}
