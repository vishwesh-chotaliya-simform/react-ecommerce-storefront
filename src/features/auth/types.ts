import type { paths } from '@/lib/api-types';

type Json<T> = { content: { 'application/json': T } };
type Body<T> = T extends { requestBody?: Json<infer B> } ? B : never;

type MeResponse =
  paths['/users/me']['get']['responses'][200]['content']['application/json']['data'];

/**
 * A cart line as `/users/me` and `/users/signin` actually return it.
 *
 * The OpenAPI document claims `product` is a populated `{ _id, title, price, imageURL, stock }`
 * here. It is not: both endpoints serialise the raw user document, so `product` arrives as a
 * bare ObjectId string. Verified against the running API — `GET /users/me` answers
 * `"cart": [{ "product": "6a84454ac2eecc1a67e2dfa2", "quantity": 1 }]`.
 *
 * Only `GET /cart` populates the product. Read cart contents from there; treat the copy on the
 * user document as ids and quantities, nothing more.
 */
export interface AuthUserCartItem {
  product: string;
  quantity: number;
}

/**
 * The authenticated user, exactly as `GET /users/me` returns it.
 *
 * `toJSON` on the backend model strips `password`, `tokenVersion`, and the reset-OTP fields,
 * so what arrives is already safe to hold in the cache. `cart` is overridden because the
 * generated type describes a shape the server does not send — see {@link AuthUserCartItem}.
 */
export type AuthUser = Omit<MeResponse, 'cart'> & { cart: AuthUserCartItem[] };

export type UserRole = AuthUser['type'];

export type SignupBody = Body<paths['/users/signup']['post']>;
export type SigninBody = Body<paths['/users/signin']['post']>;
export type ForgotPasswordBody = Body<paths['/users/forgot-password']['post']>;
export type ResetPasswordBody = Body<paths['/users/reset-password']['post']>;

/** `{ user, token }` — the only endpoint that hands back a token. */
export type SigninResult =
  paths['/users/signin']['post']['responses'][200]['content']['application/json']['data'];

/** Signup returns the created customer only — no `_id`, and crucially no token. */
export type SignupResult =
  paths['/users/signup']['post']['responses'][201]['content']['application/json']['data'];

/** The OTP comes back in the response body; no mailer is wired up on the backend. */
export type ForgotPasswordResult =
  paths['/users/forgot-password']['post']['responses'][200]['content']['application/json']['data'];
