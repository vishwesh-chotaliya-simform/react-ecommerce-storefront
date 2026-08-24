import { Minus, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { errorMessage } from '@/lib/error-message';
import { formatPrice } from '@/lib/format';

import { useRemoveCartItem, useUpdateCartQuantity } from '../api';
import type { CartItem } from '../types';

export function CartLine({ item }: { item: CartItem }) {
  const update = useUpdateCartQuantity();
  const remove = useRemoveCartItem();

  const { product, quantity } = item;
  const busy = update.isPending || remove.isPending;
  const failure = update.error ?? remove.error;

  function setQuantity(next: number) {
    // Zero is not a quantity the API accepts — `PATCH` rejects it as
    // "Quantity must be a positive integer". An empty line is a removed line.
    if (next <= 0) {
      remove.mutate({ productId: product._id });
      return;
    }

    if (next === quantity) return;
    update.mutate({ productId: product._id, quantity: next });
  }

  return (
    <li className="flex flex-col gap-4 py-6 sm:flex-row sm:items-start">
      {/* Decorative: the title beside it is the same link to the same place, so exposing
          this one too just makes a screen reader read the product twice and adds a tab stop
          that goes nowhere new. */}
      <Link to={`/products/${product._id}`} aria-hidden tabIndex={-1} className="shrink-0">
        <img
          src={product.imageURL}
          alt=""
          loading="lazy"
          className="size-24 rounded-lg bg-muted object-cover"
        />
      </Link>

      <div className="min-w-0 flex-1 space-y-1">
        <Link to={`/products/${product._id}`} className="font-medium hover:underline">
          {product.title}
        </Link>
        <p className="text-sm text-muted-foreground">{formatPrice(product.price)} each</p>
        <p className="text-xs text-muted-foreground">{product.stock} in stock</p>

        {/* Changing an <input>'s value announces nothing on its own, and the stepper moves
            that value optimistically. This says what it became, and for which product. */}
        <p className="sr-only" aria-live="polite">
          {product.title}: quantity {quantity}
        </p>

        {failure && (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(failure)}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4 sm:flex-col sm:items-end">
        <QuantityStepper
          quantity={quantity}
          stock={product.stock}
          busy={busy}
          onChange={setQuantity}
          label={product.title}
        />

        {/* The line total is arithmetic on what the server just sent, never a stored field. */}
        <p className="w-24 text-right font-semibold">{formatPrice(product.price * quantity)}</p>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => remove.mutate({ productId: product._id })}
          disabled={busy}
          aria-label={`Remove ${product.title} from cart`}
        >
          <Trash2 aria-hidden />
          Remove
        </Button>
      </div>
    </li>
  );
}

interface QuantityStepperProps {
  quantity: number;
  stock: number;
  busy: boolean;
  label: string;
  onChange: (next: number) => void;
}

function QuantityStepper({ quantity, stock, busy, label, onChange }: QuantityStepperProps) {
  const [draft, setDraft] = useState(String(quantity));
  const [lastQuantity, setLastQuantity] = useState(quantity);

  // The cache is the source of truth: an optimistic write, a rollback, or a refetch all move
  // `quantity`, and the box has to follow. Adjusted during render rather than in an effect —
  // React re-runs this component before touching the DOM, so there is no flash of the stale
  // number, and unlike a `key` remount the +/− buttons keep focus while they are clicked.
  if (quantity !== lastQuantity) {
    setLastQuantity(quantity);
    setDraft(String(quantity));
  }

  function commitDraft() {
    const parsed = Number(draft.trim());

    if (!Number.isInteger(parsed) || parsed < 0) {
      setDraft(String(quantity));
      return;
    }

    onChange(parsed);
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => onChange(quantity - 1)}
        disabled={busy}
        aria-label={quantity === 1 ? `Remove ${label} from cart` : `Decrease quantity of ${label}`}
      >
        <Minus aria-hidden />
      </Button>

      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
        inputMode="numeric"
        className="w-14 text-center"
        aria-label={`Quantity of ${label}`}
        disabled={busy}
      />

      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => onChange(quantity + 1)}
        // The known stock is a ceiling for the buttons, so the obvious path never fires a
        // request that cannot succeed. It is not a guarantee — the figure came with the cart
        // and someone else may have bought the last one since — so the server still decides.
        disabled={busy || quantity >= stock}
        aria-label={`Increase quantity of ${label}`}
      >
        <Plus aria-hidden />
      </Button>
    </div>
  );
}
