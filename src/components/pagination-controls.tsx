import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatCount } from '@/lib/format';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Describes what is being paged, for the live region. */
  label?: string;
}

export function PaginationControls({
  page,
  totalPages,
  total,
  onPageChange,
  label = 'results',
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  return (
    <nav className="flex items-center justify-between gap-4" aria-label={`${label} pagination`}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        <ChevronLeft aria-hidden />
        Previous
      </Button>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        Page {formatCount(page)} of {formatCount(totalPages)}
        <span className="hidden sm:inline"> · {formatCount(total)} total</span>
      </p>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        Next
        <ChevronRight aria-hidden />
      </Button>
    </nav>
  );
}
