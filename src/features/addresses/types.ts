import type { paths } from '@/lib/api-types';

type Json<T> = { content: { 'application/json': T } };
type Body<T> = T extends { requestBody?: Json<infer B> } ? B : never;

/**
 * One saved address.
 *
 * `GET /users/me/addresses` answers with a plain array — no pagination envelope — because the
 * server caps the book at four per user.
 */
export type Address =
  paths['/users/me/addresses']['get']['responses'][200]['content']['application/json']['data'][number];

export type AddressTag = NonNullable<Address['tag']>;

export type CreateAddressBody = Body<paths['/users/me/addresses']['post']>;
export type UpdateAddressBody = Body<paths['/users/me/addresses/{addressId}']['patch']>;
