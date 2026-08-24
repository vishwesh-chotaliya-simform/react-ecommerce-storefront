import type { paths } from '@/lib/api-types';

type Json<T> = { content: { 'application/json': T } };
type Body<T> = T extends { requestBody?: Json<infer B> } ? B : never;

/**
 * One cart line as `GET /cart` returns it.
 *
 * `product` really is populated here — the service populates `title price imageURL stock` and
 * drops lines whose product has since been deleted. This is the endpoint to read cart
 * contents from; the `cart` array on the user document holds bare ids instead.
 */
export type CartItem =
  paths['/cart']['get']['responses'][200]['content']['application/json']['data'][number];

/** The trimmed product projection the cart endpoint returns — not the full catalog product. */
export type CartProduct = CartItem['product'];

export type AddToCartBody = Body<paths['/cart']['post']>;
export type UpdateCartItemBody = Body<paths['/cart/{productId}']['patch']>;
