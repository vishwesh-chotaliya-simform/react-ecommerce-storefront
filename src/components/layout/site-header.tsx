import { LogOut, ShieldCheck, ShoppingBag, ShoppingCart, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import { useSignout } from '@/features/auth/api';
import { useSession } from '@/features/auth/use-session';
import { cartItemCount, useCart } from '@/features/cart/api';
import { formatCount } from '@/lib/format';

export function SiteHeader() {
  const { user, isAuthenticated, isLoading } = useSession();
  const signout = useSignout();
  const navigate = useNavigate();
  // Reads the same query the cart page does, so an optimistic quantity change moves this
  // number in the same render — no refetch, no reload.
  const cart = useCart();
  const count = cartItemCount(cart.data);

  function handleSignout() {
    signout.mutate(undefined, {
      onSettled: () => void navigate('/', { replace: true }),
    });
  }

  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <ShoppingBag className="size-5" aria-hidden />
          Storefront
        </Link>

        <nav className="ml-auto flex items-center gap-1">
          {isLoading ? null : isAuthenticated && user ? (
            <>
              {/* Labels collapse to icons on narrow screens. With the word kept, the
                  signed-in nav measured 431px against a 360px viewport and scrolled the whole
                  page sideways — on every route, not just the cart. */}
              {user.type === 'admin' && (
                <Button asChild variant="ghost" size="sm" aria-label="Admin">
                  <Link to="/admin">
                    <ShieldCheck aria-hidden />
                    <span className="hidden sm:inline">Admin</span>
                  </Link>
                </Button>
              )}

              <Button asChild variant="ghost" size="sm" aria-label="Cart">
                <Link to="/cart">
                  <ShoppingCart aria-hidden />
                  <span className="hidden sm:inline">Cart</span>
                  {count > 0 && (
                    <span
                      className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground"
                      aria-label={`${formatCount(count)} item${count === 1 ? '' : 's'} in cart`}
                    >
                      {formatCount(count)}
                    </span>
                  )}
                </Link>
              </Button>

              <Button asChild variant="ghost" size="sm" aria-label={`Account: ${user.name}`}>
                <Link to="/account">
                  <User aria-hidden />
                  <span className="hidden max-w-32 truncate sm:inline">{user.name}</span>
                </Link>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignout}
                disabled={signout.isPending}
                aria-label="Sign out"
              >
                <LogOut aria-hidden />
                <span className="hidden sm:inline">
                  {signout.isPending ? 'Signing out…' : 'Sign out'}
                </span>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/signin">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
