import type { paths } from '@/lib/api-types';

type Json<T> = { content: { 'application/json': T } };
type Body<T> = T extends { requestBody?: Json<infer B> } ? B : never;

/**
 * An order, as `POST /orders` returns it.
 *
 * `items` are snapshots taken at purchase time — title, price, and image are copied onto the
 * order rather than referenced. An order showing a price the catalog no longer charges is
 * correct, and joining back to the live product to "fix" it would be the bug.
 */
export type Order =
  paths['/orders']['post']['responses'][201]['content']['application/json']['data'];

export type OrderItem = Order['items'][number];
export type PlaceOrderBody = Body<paths['/orders']['post']>;

type OrderListData =
  paths['/orders']['get']['responses'][200]['content']['application/json']['data'];

/** A row of order history. Same snapshot shape as a single order. */
export type OrderSummary = OrderListData['orders'][number];
export type OrderListResult = OrderListData;

export interface OrderListParams {
  page?: number;
  limit?: number;
}
