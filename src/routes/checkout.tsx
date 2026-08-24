import { ArrowRight, MapPin, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { LoadingStatus } from '@/components/busy-indicator';
import { EmptyState, ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { MAX_ADDRESSES, useAddresses } from '@/features/addresses/api';
import { AddressBook } from '@/features/addresses/components/address-book';
import { AddressForm } from '@/features/addresses/components/address-form';
import { cartTotal, useCart } from '@/features/cart/api';
import {
  isEmptyCart,
  isInsufficientStock,
  isMissingAddress,
  usePlaceOrder,
} from '@/features/orders/api';
import { errorMessage } from '@/lib/error-message';
import { formatPrice } from '@/lib/format';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useSingleFlight } from '@/lib/use-single-flight';

export default function CheckoutPage() {
  useDocumentTitle('Checkout');

  const navigate = useNavigate();
  const cart = useCart();
  const addresses = useAddresses();
  const placeOrder = usePlaceOrder();

  /** Only the user's explicit pick. The effective selection is derived below. */
  const [chosenId, setChosenId] = useState<string | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);

  // Two clicks means two orders — `POST /orders` is not idempotent.
  const singleFlight = useSingleFlight();

  if (cart.isPending || addresses.isPending) return <CheckoutSkeleton />;

  if (cart.isError) {
    return (
      <ErrorState
        error={cart.error}
        title="Could not load your cart"
        onRetry={() => void cart.refetch()}
      />
    );
  }
  if (addresses.isError) {
    return (
      <ErrorState
        error={addresses.error}
        title="Could not load your addresses"
        onRetry={() => void addresses.refetch()}
      />
    );
  }

  const items = cart.data;
  const addressList = addresses.data;
  const total = cartTotal(items);

  /**
   * Derived, not synchronised.
   *
   * An explicit pick wins for as long as that address still exists; otherwise this falls back
   * to whatever the server currently calls the default. Deleting the selected address, or
   * having the default promoted underneath you, therefore needs no effect to keep up — the
   * next render simply computes the right answer from the refetched book.
   */
  const selectedId =
    chosenId !== undefined && addressList.some((address) => address._id === chosenId)
      ? chosenId
      : (addressList.find((address) => address.isDefault)?._id ?? addressList[0]?._id);
  const canPlace = selectedId !== undefined && !placeOrder.isPending;

  function handlePlaceOrder() {
    if (selectedId === undefined) return;

    singleFlight.run(() => {
      placeOrder.mutate(
        { addressId: selectedId },
        {
          onSuccess: (order) =>
            void navigate(`/checkout/confirmation/${order._id}`, { replace: true }),
          onSettled: singleFlight.release,
        },
      );
    });
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <section className="space-y-4" aria-labelledby="address-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="address-heading" className="text-lg font-semibold">
                Delivery address
              </h2>
              {addressList.length > 0 && addressList.length < MAX_ADDRESSES && !showForm && (
                <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
                  <Plus aria-hidden />
                  Add address
                </Button>
              )}
            </div>

            {addressList.length === 0 && !showForm && (
              <EmptyState
                title="No saved addresses"
                description="An order needs somewhere to go. Add an address to continue."
              >
                <Button onClick={() => setShowForm(true)}>
                  <MapPin aria-hidden />
                  Add an address
                </Button>
              </EmptyState>
            )}

            {addressList.length > 0 && (
              <AddressBook addresses={addressList} selectedId={selectedId} onSelect={setChosenId} />
            )}

            {showForm && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">New address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AddressForm onAdded={() => setShowForm(false)} />
                  <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>

          <section className="space-y-4" aria-labelledby="review-heading">
            <h2 id="review-heading" className="text-lg font-semibold">
              Review your order
            </h2>

            {items.length === 0 ? (
              <EmptyState title="Your cart is empty" description="There is nothing to order yet.">
                <Button asChild variant="outline">
                  <Link to="/">Browse the catalog</Link>
                </Button>
              </EmptyState>
            ) : (
              <ul className="divide-y rounded-lg border" aria-busy={cart.isFetching}>
                {items.map((item) => (
                  <li key={item.product._id} className="flex items-center gap-4 p-4">
                    <img
                      src={item.product.imageURL}
                      alt={item.product.title}
                      className="size-14 rounded-md bg-muted object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.product.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(item.product.price)} × {item.quantity} · {item.product.stock}{' '}
                        in stock
                      </p>
                    </div>
                    <p className="font-semibold">
                      {formatPrice(item.product.price * item.quantity)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Order summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="text-2xl font-semibold">{formatPrice(total)}</span>
              </div>

              <Separator />

              <Button className="w-full" size="lg" onClick={handlePlaceOrder} disabled={!canPlace}>
                {placeOrder.isPending ? 'Placing order…' : 'Place order'}
                {!placeOrder.isPending && <ArrowRight aria-hidden />}
              </Button>

              {selectedId === undefined && addressList.length > 0 && (
                <p className="text-sm text-muted-foreground">Choose a delivery address first.</p>
              )}

              {placeOrder.isError && (
                <PlaceOrderFailure
                  error={placeOrder.error}
                  onAddAddress={() => setShowForm(true)}
                />
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

/**
 * The server's own message, plus the way out of it.
 *
 * Each of these rejections is really an instruction — the cart is empty, there is nowhere to
 * ship to, someone else bought the last one — so each gets the action that resolves it rather
 * than a retry button that would fail the same way.
 */
function PlaceOrderFailure({ error, onAddAddress }: { error: unknown; onAddAddress: () => void }) {
  return (
    <div role="alert" className="space-y-2 rounded-lg border border-destructive/40 p-3">
      <p className="text-sm text-destructive">{errorMessage(error)}</p>

      {isEmptyCart(error) && (
        <Button asChild variant="outline" size="sm">
          <Link to="/">Browse the catalog</Link>
        </Button>
      )}

      {/* Opens the form. Linking to /checkout was a link to the page already on screen, so
          it navigated nowhere and left the user with no way to act on the message. */}
      {isMissingAddress(error) && (
        <Button variant="outline" size="sm" onClick={onAddAddress}>
          Add an address
        </Button>
      )}

      {isInsufficientStock(error) && (
        <p className="text-xs text-muted-foreground">
          Your cart above has been refreshed with what is actually left — adjust the quantity and
          try again.
        </p>
      )}
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-40" />
      <LoadingStatus label="Loading checkout…">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
          <Skeleton className="h-56 w-full rounded-lg" />
        </div>
      </LoadingStatus>
    </div>
  );
}
