import type { UseQueryResult } from '@tanstack/react-query';

import { BusyIndicator, LoadingStatus } from '@/components/busy-indicator';
import { ColdStartNotice } from '@/components/cold-start-notice';
import { EmptyState, ErrorState } from '@/components/error-state';
import { PaginationControls } from '@/components/pagination-controls';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCount } from '@/lib/format';
import { useSlowLoad } from '@/lib/use-slow-load';

import { DEFAULT_PAGE_SIZE, useProducts } from '../api';
import type { ProductListResult } from '../types';
import { useCatalogParams, type UseCatalogParams } from '../use-catalog-params';
import { CatalogFilters } from './catalog-filters';
import { ProductCard } from './product-card';

const GRID = 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

export function ProductGrid() {
  const catalog = useCatalogParams();
  const query = useProducts(catalog.params);

  return (
    <div className="space-y-8">
      <CatalogFilters catalog={catalog} />
      <Results catalog={catalog} query={query} />
    </div>
  );
}

interface ResultsProps {
  catalog: UseCatalogParams;
  // The whole result, not its pieces: TanStack Query's status fields are a discriminated
  // union, and destructuring them into separate props throws the narrowing away — `data`
  // would stay `T | undefined` even after the `isPending` and `isError` guards.
  query: UseQueryResult<ProductListResult, Error>;
}

function Results({ catalog, query }: ResultsProps) {
  const { data, isPending, isError, error, isFetching } = query;
  // The catalog is the first request the app makes, so a sleeping API shows up here first.
  const wakingServer = useSlowLoad(isPending);
  // `isPending` means there is nothing to show yet — a first load or a filter combination
  // never fetched before. Paging and refiltering keep the previous page on screen instead
  // (`placeholderData: keepPreviousData`), so the grid dims rather than collapsing.
  if (isPending) {
    return (
      <div className="space-y-6">
        {wakingServer && <ColdStartNotice />}
        <ProductGridSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        error={error}
        title="Could not load the catalog"
        onRetry={() => void query.refetch()}
      />
    );
  }

  const { pagination } = data;

  // An empty page past the end is not "nothing matched" — the filters may match plenty. It
  // needs its own message and its own way out, because `page` is not a filter and so
  // "Clear filters" neither appears nor would help.
  if (
    data.products.length === 0 &&
    pagination.total > 0 &&
    pagination.page > pagination.totalPages
  ) {
    return (
      <EmptyState
        title="That page is past the end of the results"
        description={`These filters fill ${formatCount(pagination.totalPages)} page${
          pagination.totalPages === 1 ? '' : 's'
        }.`}
      >
        <Button variant="outline" size="sm" onClick={() => catalog.setPage(1)}>
          Go to the first page
        </Button>
      </EmptyState>
    );
  }

  if (data.products.length === 0) {
    return (
      <EmptyState
        title="No products match those filters"
        description={
          catalog.params.search
            ? `Nothing found for "${catalog.params.search}". Catalog search matches titles only.`
            : 'Try widening the price range.'
        }
      >
        {catalog.hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={catalog.clearFilters}>
            Clear filters
          </Button>
        )}
      </EmptyState>
    );
  }

  const busy = isFetching || catalog.isPending;

  return (
    <section aria-busy={busy} className="space-y-8">
      <div className="flex items-center gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Showing {formatCount(data.products.length)} of {formatCount(pagination.total)} products
        </p>
        {busy && <BusyIndicator />}
      </div>

      <ul className={GRID}>
        {data.products.map((product) => (
          <li key={product._id}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>

      <PaginationControls
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onPageChange={catalog.setPage}
        label="Products"
      />
    </section>
  );
}

export function ProductGridSkeleton({ count = DEFAULT_PAGE_SIZE }: { count?: number }) {
  return (
    <LoadingStatus label="Loading products…">
      <div className={GRID}>
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="space-y-3">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </LoadingStatus>
  );
}
