import { Check, LogIn, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import { useSession } from '@/features/auth/use-session';
import { errorMessage } from '@/lib/error-message';
import { useSingleFlight } from '@/lib/use-single-flight';
import type { RedirectState } from '@/routes/redirect-state';

import { useAddToCart } from '../api';

interface AddToCartButtonProps {
  productId: string;
  stock: number;
}

export function AddToCartButton({ productId, stock }: AddToCartButtonProps) {
  const { isAuthenticated, isLoading } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const addToCart = useAddToCart();
  const [added, setAdded] = useState(false);

  // `POST /cart` adds to the existing quantity, so a slipped second click is a second unit.
  const singleFlight = useSingleFlight();

  if (isLoading) {
    return (
      <Button disabled className="w-full sm:w-auto">
        <ShoppingCart aria-hidden />
        Add to cart
      </Button>
    );
  }

  // No guest cart exists — `/cart` is behind `authenticate`. Send them to sign in and back,
  // through the same navigation state ProtectedRoute uses, so they land on this product again.
  if (!isAuthenticated) {
    const state: RedirectState = {
      from: `${location.pathname}${location.search}${location.hash}`,
    };

    return (
      <Button className="w-full sm:w-auto" onClick={() => void navigate('/signin', { state })}>
        <LogIn aria-hidden />
        Sign in to add to cart
      </Button>
    );
  }

  const soldOut = stock === 0;

  function handleAdd() {
    singleFlight.run(() => {
      setAdded(false);

      addToCart.mutate(
        { productId, quantity: 1 },
        {
          onSuccess: () => setAdded(true),
          onSettled: singleFlight.release,
        },
      );
    });
  }

  return (
    <div className="space-y-2">
      {/* The label stays put. Swapping it to "Added" would read as the button's state rather
          than as confirmation, and it is still a working "add another" button. */}
      <Button
        className="w-full sm:w-auto"
        onClick={handleAdd}
        disabled={soldOut || addToCart.isPending}
      >
        <ShoppingCart aria-hidden />
        {soldOut ? 'Out of stock' : addToCart.isPending ? 'Adding…' : 'Add to cart'}
      </Button>

      {added && !addToCart.isPending && !addToCart.isError && (
        <p role="status" className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Check className="size-4" aria-hidden />
          Added to your cart.
          <Link to="/cart" className="text-foreground underline underline-offset-4">
            View cart
          </Link>
        </p>
      )}

      {addToCart.isError && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(addToCart.error)}
        </p>
      )}
    </div>
  );
}
