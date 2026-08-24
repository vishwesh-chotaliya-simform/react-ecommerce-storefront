import { Package, ShieldCheck } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';

import { cn } from '@/lib/utils';

/**
 * The admin shell.
 *
 * Nested inside `AdminRoute`, so everything below it is already known to be an admin — this
 * only has to make the change of context obvious. Anything the storefront header offers
 * (cart, account) stays available above it.
 */
export function AdminLayout() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-muted-foreground" aria-hidden />
          <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        </div>

        <nav aria-label="Admin sections" className="flex items-center gap-1">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50',
              )
            }
          >
            <Package className="size-4" aria-hidden />
            Products
          </NavLink>
        </nav>
      </div>

      <Outlet />
    </div>
  );
}
