/**
 * The single source of query keys.
 *
 * Never inline a key array at a call site: `['products', filters]` written by hand in two
 * places drifts, and the invalidation in the second place silently stops matching.
 *
 * Keys nest from broad to narrow, so `invalidateQueries({ queryKey: queryKeys.products.all })`
 * catches every list and every detail underneath it.
 */

/**
 * Anything serialisable into a key — filter objects, pagination, sort.
 *
 * `object` rather than `Record<string, unknown>`: interfaces have no implicit index
 * signature, so the stricter constraint would reject every params type a feature declares.
 */
type KeyParams = object;

export const queryKeys = {
  /**
   * The signed-in user. Keyed without the token: on sign-out the whole cache is cleared, so
   * there is never a stale entry from a previous session to collide with.
   */
  session: {
    all: ['session'] as const,
    currentUser: () => [...queryKeys.session.all, 'me'] as const,
  },
  /**
   * The cart is a single server-owned list — there is no per-page or per-filter variant, so
   * one key covers it. Every mutation returns `data: null`, so the flow is always
   * optimistic-update then invalidate this key.
   */
  cart: {
    all: ['cart'] as const,
  },

  /** The address book — a plain array from the server, no pagination, no variants. */
  addresses: {
    all: ['addresses'] as const,
  },

  /**
   * Orders. Placing one seeds `detail(id)` straight from the response so the confirmation
   * screen has the snapshot without a second round trip.
   */
  orders: {
    all: ['orders'] as const,
    /** Order history lists. Kept apart from `details` so one can be invalidated alone. */
    lists: () => [...queryKeys.orders.all, 'list'] as const,
    list: <P extends KeyParams>(params: P) => [...queryKeys.orders.lists(), params] as const,
    details: () => [...queryKeys.orders.all, 'detail'] as const,
    detail: (orderId: string) => [...queryKeys.orders.details(), orderId] as const,
  },

  /**
   * The admin's own product list. Kept apart from `products` on purpose: the two endpoints
   * answer differently — `/admin/products` is scoped to the signed-in admin and returns the
   * raw document — so they must never share a cache entry.
   */
  adminProducts: {
    all: ['admin-products'] as const,
    lists: () => [...queryKeys.adminProducts.all, 'list'] as const,
    list: <P extends KeyParams>(params: P) => [...queryKeys.adminProducts.lists(), params] as const,
    details: () => [...queryKeys.adminProducts.all, 'detail'] as const,
    detail: (productId: string) => [...queryKeys.adminProducts.details(), productId] as const,
  },

  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: <P extends KeyParams>(params: P) => [...queryKeys.products.lists(), params] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (productId: string) => [...queryKeys.products.details(), productId] as const,
  },

  /**
   * Reviews hang off the product they belong to, so invalidating
   * `queryKeys.reviews.forProduct(id)` after writing a review catches every page, rating
   * filter, and sort order of that product's list at once.
   */
  reviews: {
    all: ['reviews'] as const,
    forProduct: (productId: string) => [...queryKeys.reviews.all, 'product', productId] as const,
    list: <P extends KeyParams>(productId: string, params: P) =>
      [...queryKeys.reviews.forProduct(productId), params] as const,
    /** The signed-in user's own reviews, across all products. */
    mine: () => [...queryKeys.reviews.all, 'mine'] as const,
    myList: <P extends KeyParams>(params: P) => [...queryKeys.reviews.mine(), params] as const,
  },
} as const;
