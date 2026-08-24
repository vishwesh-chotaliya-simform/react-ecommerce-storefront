import { Plus } from 'lucide-react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { ProductTable } from '@/features/admin/components/product-table';
import { useDocumentTitle } from '@/lib/use-document-title';

export default function AdminProductsPage() {
  useDocumentTitle('Admin · Products');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Your products</h2>
          <p className="text-sm text-muted-foreground">
            Only products created by your account appear here.
          </p>
        </div>

        <Button asChild>
          <Link to="/admin/products/new">
            <Plus aria-hidden />
            New product
          </Link>
        </Button>
      </div>

      <ProductTable />
    </div>
  );
}
