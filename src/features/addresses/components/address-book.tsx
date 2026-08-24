import { Check, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/error-message';

import { useDeleteAddress, useSetDefaultAddress } from '../api';
import type { Address } from '../types';

interface AddressBookProps {
  addresses: Address[];
  selectedId: string | undefined;
  onSelect: (addressId: string) => void;
}

/**
 * The saved addresses, as a real radio group.
 *
 * Native `<input type="radio">` rather than `role="radio"` on a div: the ARIA pattern also
 * requires roving tabindex and arrow-key handling, and hand-rolling those got it wrong — the
 * group announced itself as a radio group that arrow keys could not operate. The browser
 * gives all of that for free, and keeps the row's own buttons outside the control instead of
 * nesting interactive elements inside a radio.
 *
 * "Default" and "selected for this order" stay separate: the default is a server-side
 * property of the book, while the selection only applies to the order being placed.
 * Conflating them means changing where one parcel goes rewrites the user's default.
 */
export function AddressBook({ addresses, selectedId, onSelect }: AddressBookProps) {
  const setDefault = useSetDefaultAddress();
  const remove = useDeleteAddress();
  const failure = setDefault.error ?? remove.error;
  const busy = setDefault.isPending || remove.isPending;

  return (
    <div className="space-y-3">
      <fieldset className="space-y-3">
        <legend className="sr-only">Delivery address</legend>

        {addresses.map((address) => {
          const selected = address._id === selectedId;
          const inputId = `address-${address._id}`;

          return (
            <div
              key={address._id}
              className={`flex flex-wrap items-start gap-3 rounded-lg border p-4 transition-colors ${
                selected ? 'border-primary bg-accent/40' : ''
              }`}
            >
              <input
                type="radio"
                id={inputId}
                name="deliveryAddress"
                value={address._id}
                checked={selected}
                onChange={() => onSelect(address._id)}
                className="mt-1 size-4 accent-primary"
              />

              <label htmlFor={inputId} className="min-w-0 flex-1 cursor-pointer space-y-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{address.addressLine1}</span>
                  {address.tag && (
                    <Badge variant="outline" className="capitalize">
                      {address.tag}
                    </Badge>
                  )}
                  {address.isDefault && <Badge variant="secondary">Default</Badge>}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {address.city}, {address.state} — {address.pincode}
                </span>
              </label>

              <div className="flex items-center gap-1">
                {!address.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDefault.mutate({ addressId: address._id })}
                    disabled={busy}
                  >
                    <Check aria-hidden />
                    Make default
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove.mutate({ addressId: address._id })}
                  disabled={busy}
                  aria-label={`Delete address ${address.addressLine1}`}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            </div>
          );
        })}
      </fieldset>

      {failure && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(failure)}
        </p>
      )}
    </div>
  );
}
