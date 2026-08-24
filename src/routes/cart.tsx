import { ArrowRight, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { LoadingStatus } from '@/components/busy-indicator';
import { EmptyState, ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cartItemCount, cartTotal, useCart, useClearCart } from '@/features/cart/api';
import { CartLine } from '@/features/cart/components/cart-line';
import { errorMessage } from '@/lib/error-message';
import { formatCount, formatPrice } from '@/lib/format';
import { useDocumentTitle } from '@/lib/use-document-title';

export default function CartPage() {
  useDocumentTitle('Your cart');

  const query = useCart();
  const clearCart = useClearCart();
  const [confirmingEmpty, setConfirmingEmpty] = useState(false);

  if (query.isPending) return <CartSkeleton />;

  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        title="Could not load your cart"
        onRetry={() => void query.refetch()}
      />
    );
  }

  const items = query.data;

  if (items.length === 0) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>
        {/* Also rendered here, not only alongside a populated cart: removing the last line
            swaps this branch in, and a live region that unmounts with the list can never
            announce that the cart is now empty. */}
        <CartAnnouncer count={0} total={0} />
        <EmptyState
          title="Your cart is empty"
          description="Nothing here yet — browse the catalog and add something."
        >
          <Button asChild>
            <Link to="/">
              Browse the catalog
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </EmptyState>
      </div>
    );
  }

  // Derived on every render from the lines the server sent. Nothing about the total is
  // cached, so it cannot disagree with the list above it.
  const total = cartTotal(items);
  const count = cartItemCount(items);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>
        {/* Two steps, because emptying the cart is destructive, instant, and has no undo. */}
        {confirmingEmpty ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Empty the whole cart?</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                clearCart.mutate(undefined, { onSettled: () => setConfirmingEmpty(false) })
              }
              disabled={clearCart.isPending}
            >
              {clearCart.isPending ? 'Emptying…' : 'Yes, empty it'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmingEmpty(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmingEmpty(true)}>
            Empty cart
          </Button>
        )}
      </div>

      {/* Without this a failed clear rolled back silently and the screen looked untouched. */}
      {clearCart.isError && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(clearCart.error)}
        </p>
      )}

      <ul className="divide-y" aria-busy={query.isFetching}>
        {items.map((item) => (
          <CartLine key={item.product._id} item={item} />
        ))}
      </ul>

      <Separator />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground" aria-hidden>
            {formatCount(count)} item{count === 1 ? '' : 's'}
          </p>
          <p className="text-2xl font-semibold" aria-hidden>
            {formatPrice(total)}
          </p>

          <CartAnnouncer count={count} total={total} />
        </div>

        <Button asChild size="lg">
          <Link to="/checkout">
            <ShoppingCart aria-hidden />
            Checkout
          </Link>
        </Button>
      </div>
    </div>
  );
}

/**
 * One live region for the whole cart.
 *
 * Count and total are read together rather than as two unrelated updates, and because this
 * renders in the empty branch too, emptying the cart is announced instead of falling silent
 * when the list — and any region inside it — unmounts.
 */
function CartAnnouncer({ count, total }: { count: number; total: number }) {
  return (
    <p className="sr-only" role="status" aria-live="polite">
      Cart updated: {formatCount(count)} item{count === 1 ? '' : 's'}, total {formatPrice(total)}
    </p>
  );
}

function CartSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-40" />
      <LoadingStatus label="Loading your cart…">
        <div className="space-y-6">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex gap-4">
              <Skeleton className="size-24 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </LoadingStatus>
    </div>
  );
}
