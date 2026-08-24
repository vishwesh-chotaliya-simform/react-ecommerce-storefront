import { Package } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';

import { LoadingStatus } from '@/components/busy-indicator';
import { EmptyState, ErrorState } from '@/components/error-state';
import { PaginationControls } from '@/components/pagination-controls';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrders } from '@/features/orders/api';
import { formatCount, formatPrice } from '@/lib/format';
import { useDocumentTitle } from '@/lib/use-document-title';

export default function OrdersPage() {
  useDocumentTitle('Your orders');

  const [searchParams, setSearchParams] = useSearchParams();
  const rawPage = Number(searchParams.get('page'));
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.trunc(rawPage) : 1;

  const query = useOrders({ page });

  const setPage = (next: number) =>
    setSearchParams((current) => {
      const params = new URLSearchParams(current);
      if (next <= 1) params.delete('page');
      else params.set('page', String(next));
      return params;
    });

  if (query.isPending) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-40" />
        <LoadingStatus label="Loading your orders…">
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        </LoadingStatus>
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        title="Could not load your orders"
        onRetry={() => void query.refetch()}
      />
    );
  }

  const { orders, pagination } = query.data;

  if (orders.length === 0 && pagination.total === 0) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-semibold tracking-tight">Your orders</h1>
        <EmptyState title="No orders yet" description="Anything you buy will show up here.">
          <Button asChild>
            <Link to="/">Browse the catalog</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-semibold tracking-tight">Your orders</h1>
        <EmptyState
          title="That page is past the end of your orders"
          description={`You have ${formatCount(pagination.total)} order${
            pagination.total === 1 ? '' : 's'
          }.`}
        >
          <Button variant="outline" onClick={() => setPage(1)}>
            Go to the first page
          </Button>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Your orders</h1>

      <ul className="space-y-4" aria-busy={query.isFetching}>
        {orders.map((order) => (
          <li key={order._id}>
            <Link
              to={`/orders/${order._id}`}
              className="block rounded-lg border p-4 transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Package className="size-4 text-muted-foreground" aria-hidden />
                  <span className="text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {/* The order's own total, snapshotted at purchase. */}
                <span className="font-semibold">{formatPrice(order.totalAmount)}</span>
              </div>

              <ul className="mt-3 space-y-1">
                {order.items.map((item) => (
                  <li key={item.product} className="flex items-center gap-3 text-sm">
                    <img
                      src={item.imageURL}
                      alt=""
                      className="size-8 rounded bg-muted object-cover"
                    />
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                    {/* The price paid then, not the catalog price now. */}
                    <span className="text-muted-foreground">
                      {formatPrice(item.price)} × {item.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            </Link>
          </li>
        ))}
      </ul>

      <PaginationControls
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onPageChange={setPage}
        label="Orders"
      />
    </div>
  );
}
