import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductForm } from '@/features/admin/components/product-form';
import { useDocumentTitle } from '@/lib/use-document-title';

export default function AdminProductNewPage() {
  useDocumentTitle('Admin · New product');
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin">
          <ArrowLeft aria-hidden />
          Back to products
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>
            <h1>New product</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm
            onDone={() => void navigate('/admin')}
            onCancel={() => void navigate('/admin')}
          />
        </CardContent>
      </Card>
    </div>
  );
}
