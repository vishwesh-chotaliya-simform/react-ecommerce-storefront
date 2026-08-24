import { ArrowLeft, Package } from 'lucide-react';
import { Link, useParams } from 'react-router';

import { LoadingStatus } from '@/components/busy-indicator';
import { ErrorState } from '@/components/error-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrder } from '@/features/orders/api';
import { formatPrice } from '@/lib/format';
import { useDocumentTitle } from '@/lib/use-document-title';

export default function OrderDetailPage() {
  const { orderId = '' } = useParams();
  const query = useOrder(orderId);

  useDocumentTitle(query.data ? `Order ${query.data._id.slice(-6)}` : 'Order');

  return (
    <div className="space-y-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/orders">
          <ArrowLeft aria-hidden />
          Back to orders
        </Link>
      </Button>

      {query.isPending ? (
        <LoadingStatus label="Loading order…">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        </LoadingStatus>
      ) : query.isError ? (
        <ErrorState error={query.error} title="Could not load this order" />
      ) : (
        <div className="space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Order</h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">{query.data._id}</span> ·{' '}
              {new Date(query.data.createdAt).toLocaleString()}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="size-4" aria-hidden />
                Items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="divide-y">
                {query.data.items.map((item) => (
                  <li key={item.product} className="flex items-center gap-4 py-3">
                    {/* Decorative — the title next to it links to the same product. */}
                    <Link
                      to={`/products/${item.product}`}
                      aria-hidden
                      tabIndex={-1}
                      className="shrink-0"
                    >
                      <img
                        src={item.imageURL}
                        alt=""
                        className="size-14 rounded-md bg-muted object-cover"
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/products/${item.product}`}
                        className="truncate font-medium hover:underline"
                      >
                        {item.title}
                      </Link>
                      {/* Snapshot values. The catalog price may have moved since. */}
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(item.price)} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                  </li>
                ))}
              </ul>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="font-medium">Total paid</span>
                <span className="text-2xl font-semibold">
                  {formatPrice(query.data.totalAmount)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Shipped to</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {/* Copied onto the order at purchase time — editing or deleting the address in
                  the address book afterwards does not rewrite where this parcel went. */}
              <p className="flex items-center gap-2 font-medium">
                {query.data.shippingAddress.addressLine1}
                {query.data.shippingAddress.tag && (
                  <Badge variant="outline" className="capitalize">
                    {query.data.shippingAddress.tag}
                  </Badge>
                )}
              </p>
              <p className="text-muted-foreground">
                {query.data.shippingAddress.city}, {query.data.shippingAddress.state} —{' '}
                {query.data.shippingAddress.pincode}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
