import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';

import { LoadingStatus } from '@/components/busy-indicator';
import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminProduct } from '@/features/admin/api';
import { ProductForm } from '@/features/admin/components/product-form';
import { useDocumentTitle } from '@/lib/use-document-title';

export default function AdminProductEditPage() {
  const { productId = '' } = useParams();
  const query = useAdminProduct(productId);
  const navigate = useNavigate();

  useDocumentTitle(query.data ? `Admin · ${query.data.title}` : 'Admin · Edit product');

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin">
          <ArrowLeft aria-hidden />
          Back to products
        </Link>
      </Button>

      {query.isPending ? (
        <LoadingStatus label="Loading product…">
          <Skeleton className="h-96 w-full rounded-lg" />
        </LoadingStatus>
      ) : query.isError ? (
        // A product created by a different admin answers 404 here, not 403 — the list is
        // scoped by `userId`, so someone else's product simply does not exist for you.
        <ErrorState error={query.error} title="Could not load this product" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              <h1>Edit product</h1>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProductForm
              product={query.data}
              onDone={() => void navigate('/admin')}
              onCancel={() => void navigate('/admin')}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
