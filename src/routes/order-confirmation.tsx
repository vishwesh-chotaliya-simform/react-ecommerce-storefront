import { CheckCircle2, Package } from 'lucide-react';
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

export default function OrderConfirmationPage() {
  useDocumentTitle('Order confirmed');

  const { orderId = '' } = useParams();
  const query = useOrder(orderId);

  if (query.isPending) {
    return (
      <LoadingStatus label="Loading your order…">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </LoadingStatus>
    );
  }

  if (query.isError) {
    return <ErrorState error={query.error} title="Could not load this order" />;
  }

  const order = query.data;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-2 text-center">
        <CheckCircle2 className="mx-auto size-12 text-emerald-600" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight">Order placed</h1>
        <p className="text-sm text-muted-foreground">
          Order <span className="font-mono">{order._id}</span> ·{' '}
          {new Date(order.createdAt).toLocaleString()}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="size-4" aria-hidden />
            What you ordered
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="divide-y">
            {order.items.map((item) => (
              <li key={item.product} className="flex items-center gap-4 py-3">
                <img
                  src={item.imageURL}
                  alt={item.title}
                  className="size-14 rounded-md bg-muted object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.title}</p>
                  {/* Every value here is the order's own snapshot. The catalog price may have
                      moved since; what was paid did not. */}
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
            <span className="text-2xl font-semibold">{formatPrice(order.totalAmount)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shipping to</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="flex items-center gap-2 font-medium">
            {order.shippingAddress.addressLine1}
            {order.shippingAddress.tag && (
              <Badge variant="outline" className="capitalize">
                {order.shippingAddress.tag}
              </Badge>
            )}
          </p>
          <p className="text-muted-foreground">
            {order.shippingAddress.city}, {order.shippingAddress.state} —{' '}
            {order.shippingAddress.pincode}
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link to="/">Continue shopping</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={`/orders/${order._id}`}>View this order</Link>
        </Button>
      </div>
    </div>
  );
}
