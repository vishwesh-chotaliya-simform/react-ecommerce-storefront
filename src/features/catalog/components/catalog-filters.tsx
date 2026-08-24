import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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

import type { UseCatalogParams } from '../use-catalog-params';

const SEARCH_DEBOUNCE_MS = 400;

/** `sortBy`/`sortOrder` are two params, but one decision to the person using it. */
const SORT_OPTIONS = [
  { value: 'date:desc', label: 'Newest first' },
  { value: 'date:asc', label: 'Oldest first' },
  { value: 'price:asc', label: 'Price: low to high' },
  { value: 'price:desc', label: 'Price: high to low' },
  { value: 'title:asc', label: 'Title: A–Z' },
  { value: 'title:desc', label: 'Title: Z–A' },
] as const;

export function CatalogFilters({ catalog }: { catalog: UseCatalogParams }) {
  const { params, setFilter, setPriceRange, clearFilters, hasActiveFilters } = catalog;

  return (
    <div className="space-y-4">
      {/* Top-aligned, not bottom-aligned: the search column carries a hint line under its
          input, so `items-end` matched the two columns' bottoms and pushed the sort control
          down onto the hint's line. Both columns lead with a same-height label, so aligning
          the tops puts the input and the select on one line. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <SearchBox value={params.search ?? ''} onCommit={(value) => setFilter('search', value)} />

        <div className="grid gap-2">
          <Label htmlFor="sort">Sort</Label>
          <Select
            value={`${params.sortBy ?? 'date'}:${params.sortOrder ?? 'desc'}`}
            onValueChange={(value) => {
              const [sortBy, sortOrder] = value.split(':');
              // Both halves move together, so this must not be two `setFilter` calls — the
              // second would overwrite the history entry the first just pushed.
              catalog.setSortSelection(sortBy ?? 'date', sortOrder ?? 'desc');
            }}
          >
            <SelectTrigger id="sort" className="w-full sm:w-52">
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

      <PriceRange
        // Remounting on a URL change resets both drafts without an effect that mirrors
        // props into state — Back, Forward, and Clear filters all land correctly.
        key={`${params.minPrice ?? ''}-${params.maxPrice ?? ''}`}
        min={params.minPrice}
        max={params.maxPrice}
        incomplete={catalog.hasIncompletePriceRange}
        onApply={setPriceRange}
      />

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X aria-hidden />
          Clear filters
        </Button>
      )}
    </div>
  );
}

/**
 * The search box keeps its own value so typing stays instant, and pushes to the URL only
 * once the typing stops. Without the debounce, "keyboard" would be eight requests and eight
 * history entries — Back would need eight presses to undo one word.
 */
function SearchBox({ value, onCommit }: { value: string; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  const committed = useRef(value);

  // The callback is read through a ref so it stays out of the debounce effect's dependencies.
  // Callers pass an inline arrow, which is a fresh function on every parent render; with it in
  // the deps, an unrelated re-render tore the pending timer down and started a new one.
  const commit = useRef(onCommit);
  useEffect(() => {
    commit.current = onCommit;
  });

  // Adopt changes that came from elsewhere — Back/Forward, or Clear filters — without
  // clobbering what is currently being typed.
  useEffect(() => {
    if (value !== committed.current) {
      committed.current = value;
      setDraft(value);
    }
  }, [value]);

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
      <Label htmlFor="search">Search</Label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Search by title…"
          className="pl-9"
        />
      </div>
      <p className="text-xs text-muted-foreground">Matches product titles.</p>
    </div>
  );
}

/**
 * Both bounds or neither: the API answers a lone bound with
 * `minPrice and maxPrice must be provided together`, so this commits as a pair on submit
 * rather than filtering as you type.
 */
function PriceRange({
  min,
  max,
  incomplete,
  onApply,
}: {
  min: number | undefined;
  max: number | undefined;
  incomplete: boolean;
  onApply: (min: number | undefined, max: number | undefined) => void;
}) {
  // Seeded from the URL once; the `key` above remounts this when the URL bounds change.
  const [minDraft, setMinDraft] = useState(min?.toString() ?? '');
  const [maxDraft, setMaxDraft] = useState(max?.toString() ?? '');

  const parse = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === '') return undefined;
    const value = Number(trimmed);
    return Number.isFinite(value) && value >= 0 ? value : undefined;
  };

  const nextMin = parse(minDraft);
  const nextMax = parse(maxDraft);
  const onlyOneSide = (nextMin === undefined) !== (nextMax === undefined);
  const inverted = nextMin !== undefined && nextMax !== undefined && nextMin > nextMax;

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onApply(nextMin, nextMax);
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="minPrice">Min price</Label>
        <Input
          id="minPrice"
          inputMode="numeric"
          value={minDraft}
          onChange={(event) => setMinDraft(event.target.value)}
          placeholder="0"
          className="w-32"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="maxPrice">Max price</Label>
        <Input
          id="maxPrice"
          inputMode="numeric"
          value={maxDraft}
          onChange={(event) => setMaxDraft(event.target.value)}
          placeholder="50000"
          className="w-32"
        />
      </div>

      <Button type="submit" variant="outline" disabled={onlyOneSide || inverted}>
        Apply range
      </Button>

      {incomplete && (
        <p className="w-full text-xs text-destructive">
          Only one price bound is set, so the results below are <strong>not</strong> filtered by
          price. The API rejects a single bound — set both, or clear both.
        </p>
      )}
      {!incomplete && onlyOneSide && (
        <p className="w-full text-xs text-muted-foreground">
          Enter both a minimum and a maximum — the API rejects a single bound.
        </p>
      )}
      {inverted && (
        <p className="w-full text-xs text-destructive">
          The minimum cannot be greater than the maximum.
        </p>
      )}
    </form>
  );
}
