import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/lib/use-document-title';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');

  return (
    <div className="mx-auto max-w-md space-y-4 py-24 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Button asChild>
        <Link to="/">Back to the catalog</Link>
      </Button>
    </div>
  );
}
