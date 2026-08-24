import { ProductGrid } from '@/features/catalog/components/product-grid';
import { useDocumentTitle } from '@/lib/use-document-title';

export default function HomePage() {
  useDocumentTitle('Catalog');

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Catalog</h1>
        <p className="text-sm text-muted-foreground">Everything currently in stock.</p>
      </div>

      <ProductGrid />
    </div>
  );
}
