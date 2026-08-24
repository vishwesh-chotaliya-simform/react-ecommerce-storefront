import { ExternalLink, Pencil, Search, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

import { BusyIndicator, LoadingStatus } from '@/components/busy-indicator';
import { EmptyState, ErrorState } from '@/components/error-state';
import { PaginationControls } from '@/components/pagination-controls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { errorMessage } from '@/lib/error-message';
import { formatCount, formatPrice } from '@/lib/format';

import { useAdminProducts, useDeleteProduct } from '../api';
import type { AdminProduct } from '../types';
import { useAdminProductParams } from '../use-admin-product-params';

const SEARCH_DEBOUNCE_MS = 400;

/**
 * Only the orderings the server actually applies.
 *
 * `sortBy=price` is accepted and ignored — the response comes back by `createdAt` — so a price
 * option here would look like a working control that quietly does nothing.
 */
const SORT_OPTIONS = [
  { value: 'date:desc', label: 'Newest first' },
  { value: 'date:asc', label: 'Oldest first' },
  { value: 'title:asc', label: 'Title: A–Z' },
  { value: 'title:desc', label: 'Title: Z–A' },
] as const;

export function ProductTable() {
  const table = useAdminProductParams();
  const query = useAdminProducts(table.params);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <SearchBox value={table.params.search ?? ''} onCommit={table.setSearch} />

        <div className="grid gap-2">
          <Label htmlFor="admin-sort">Sort</Label>
          <Select
            value={`${table.params.sortBy ?? 'date'}:${table.params.sortOrder ?? 'desc'}`}
            onValueChange={(value) => {
              const [sortBy, sortOrder] = value.split(':');
              table.setSort(sortBy ?? 'date', sortOrder ?? 'desc');
            }}
          >
            <SelectTrigger id="admin-sort" className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {query.isPending ? (
        <TableSkeleton />
      ) : query.isError ? (
        <ErrorState
          error={query.error}
          title="Could not load your products"
          onRetry={() => void query.refetch()}
        />
      ) : query.data.products.length === 0 &&
        query.data.pagination.total > 0 &&
        query.data.pagination.page > query.data.pagination.totalPages ? (
        // An empty page past the end is not an empty account. Without this the table claims
        // the admin has created nothing, on an account that owns a full catalog — which is
        // also where you land after deleting the last rows of the last page.
        <EmptyState
          title="That page is past the end of your products"
          description={`You have ${formatCount(query.data.pagination.total)} product${
            query.data.pagination.total === 1 ? '' : 's'
          }.`}
        >
          <Button variant="outline" size="sm" onClick={() => table.setPage(1)}>
            Go to the first page
          </Button>
        </EmptyState>
      ) : query.data.products.length === 0 ? (
        <EmptyProducts hasFilters={table.hasFilters} onClear={table.clearFilters} />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {formatCount(query.data.pagination.total)} product
              {query.data.pagination.total === 1 ? '' : 's'}
            </p>
            {query.isFetching && <BusyIndicator />}
          </div>

          {/* Below `sm` the table becomes cards. Forcing four columns into 360px left the
              product name at 86px — one visible character — and letting the table keep its
              intrinsic width made the whole page scroll sideways. Neither is a table worth
              having on a phone. */}
          <ul className="space-y-3 sm:hidden">
            {query.data.products.map((product) => (
              <li key={product._id} className="space-y-3 rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <img
                    src={product.imageURL}
                    alt=""
                    className="size-12 shrink-0 rounded bg-muted object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{product.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {product.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <span className="font-semibold">{formatPrice(product.price)}</span>
                  <span className="text-muted-foreground">
                    {formatCount(product.stock)} in stock
                  </span>
                </div>

                <ProductActions product={product} />
              </li>
            ))}
          </ul>

          <div className="hidden w-full overflow-x-auto rounded-lg border sm:block">
            {/* `table-fixed` is load-bearing, not cosmetic. An auto-layout table sizes itself
                from its content, and that intrinsic width escapes the `overflow-x-auto` box
                and makes the *document* scroll sideways. Fixed layout sizes the table to its
                container instead; the columns below give it sensible proportions. */}
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col />
                <col className="w-24" />
                <col className="w-20" />
                <col className="w-44" />
              </colgroup>
              <caption className="sr-only">Products you have created</caption>
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th scope="col" className="p-3 font-medium">
                    Product
                  </th>
                  <th scope="col" className="p-3 text-right font-medium">
                    Price
                  </th>
                  <th scope="col" className="p-3 text-right font-medium">
                    Stock
                  </th>
                  <th scope="col" className="p-3 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {query.data.products.map((product) => (
                  <ProductRow key={product._id} product={product} />
                ))}
              </tbody>
            </table>
          </div>

          <PaginationControls
            page={query.data.pagination.page}
            totalPages={query.data.pagination.totalPages}
            total={query.data.pagination.total}
            onPageChange={table.setPage}
            label="Products"
          />
        </div>
      )}
    </div>
  );
}

function ProductRow({ product }: { product: AdminProduct }) {
  return (
    <tr>
      <td className="p-3">
        <div className="flex items-center gap-3">
          <img
            src={product.imageURL}
            alt=""
            className="size-10 shrink-0 rounded bg-muted object-cover"
          />
          <div className="min-w-0">
            <p className="truncate font-medium">{product.title}</p>
            <p className="truncate text-xs text-muted-foreground">{product.description}</p>
          </div>
        </div>
      </td>
      <td className="p-3 text-right whitespace-nowrap">{formatPrice(product.price)}</td>
      <td className="p-3 text-right whitespace-nowrap">{formatCount(product.stock)}</td>
      <td className="p-3">
        <ProductActions product={product} align="end" />
      </td>
    </tr>
  );
}

/**
 * View / edit / delete for one product, shared by the card and the table row.
 *
 * The delete confirmation and its error live here rather than in each layout, so the two
 * cannot drift — a confirmation that only guarded one of them would be worse than none.
 */
function ProductActions({
  product,
  align = 'start',
}: {
  product: AdminProduct;
  align?: 'start' | 'end';
}) {
  const remove = useDeleteProduct();
  const [confirming, setConfirming] = useState(false);
  const justify = align === 'end' ? 'justify-end' : 'justify-start';
  const text = align === 'end' ? 'text-right' : 'text-left';

  return (
    <div>
      <div className={`flex flex-wrap items-center gap-1 ${justify}`}>
        <Button asChild variant="ghost" size="sm">
          <Link to={`/products/${product._id}`} aria-label={`View ${product.title} in the shop`}>
            <ExternalLink aria-hidden />
          </Link>
        </Button>

        <Button asChild variant="outline" size="sm">
          <Link to={`/admin/products/${product._id}/edit`}>
            <Pencil aria-hidden />
            Edit
          </Link>
        </Button>

        {confirming ? (
          <>
            <Button
              variant="destructive"
              size="sm"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate({ productId: product._id }, { onSettled: () => setConfirming(false) })
              }
            >
              {remove.isPending ? 'Deleting…' : 'Yes, delete'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(true)}
            aria-label={`Delete ${product.title}`}
          >
            <Trash2 aria-hidden />
          </Button>
        )}
      </div>

      {confirming && (
        <p className={`mt-2 text-xs text-destructive ${text}`}>
          This removes it from the shop and from every customer&apos;s cart. It cannot be undone.
        </p>
      )}

      {remove.isError && (
        <p role="alert" className={`mt-2 text-xs text-destructive ${text}`}>
          {errorMessage(remove.error)}
        </p>
      )}
    </div>
  );
}

/**
 * The empty state has to explain the scoping.
 *
 * `/admin/products` filters by `userId`, so a second admin account sees nothing against a
 * full catalog. Without saying so, that reads as a broken page.
 */
function EmptyProducts({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  if (hasFilters) {
    return (
      <EmptyState
        title="No products match that search"
        description="Admin search looks at both the title and the description."
      >
        <Button variant="outline" size="sm" onClick={onClear}>
          Clear search
        </Button>
      </EmptyState>
    );
  }

  return (
    <EmptyState
      title="You have not created any products yet"
      description="This list only shows products created by your own account — other admins' products, and the rest of the catalog, are not shown here."
    >
      <Button asChild>
        <Link to="/admin/products/new">Create your first product</Link>
      </Button>
    </EmptyState>
  );
}

function SearchBox({ value, onCommit }: { value: string; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  const committed = useRef(value);
  const commit = useRef(onCommit);
  useEffect(() => {
    commit.current = onCommit;
  });

  useEffect(() => {
    if (draft === committed.current) return;

    const timer = setTimeout(() => {
      committed.current = draft;
      commit.current(draft);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [draft]);

  return (
    <div className="grid flex-1 gap-2">
      <Label htmlFor="admin-search">Search</Label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id="admin-search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Search your products…"
          className="pl-9"
        />
      </div>
      <p className="text-xs text-muted-foreground">Matches title and description.</p>
    </div>
  );
}

function TableSkeleton() {
  return (
    <LoadingStatus label="Loading your products…">
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </LoadingStatus>
  );
}
