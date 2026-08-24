import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/use-session';
import { api, apiPath } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

import type { Address, CreateAddressBody } from './types';

/** The server allows four; the form should stop offering to add a fifth. */
export const MAX_ADDRESSES = 4;

export function useAddresses() {
  const { isAuthenticated } = useSession();

  return useQuery({
    queryKey: queryKeys.addresses.all,
    queryFn: ({ signal }) => api.get<Address[]>('/users/me/addresses', { signal }),
    enabled: isAuthenticated,
  });
}

/**
 * Every write refetches the whole book rather than patching the cache.
 *
 * The server moves more than the row you touched: adding a default unsets the previous one,
 * and deleting the default promotes another. Predicting those side effects on the client is
 * how the list ends up showing two defaults, or none. One refetch, one truth.
 */
function useAddressMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.addresses.all }),
  });
}

export function useAddAddress() {
  return useAddressMutation((body: CreateAddressBody) =>
    api.post<Address>('/users/me/addresses', body),
  );
}

export function useDeleteAddress() {
  return useAddressMutation(({ addressId }: { addressId: string }) =>
    api.delete<Address[]>(apiPath`/users/me/addresses/${addressId}`),
  );
}

export function useSetDefaultAddress() {
  return useAddressMutation(({ addressId }: { addressId: string }) =>
    api.patch<Address>(apiPath`/users/me/addresses/${addressId}/default`),
  );
}
