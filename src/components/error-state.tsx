import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-error';
import { errorMessage } from '@/lib/error-message';

/**
 * Whether trying the identical request again could plausibly succeed.
 *
 * A 4xx is a verdict on the request itself — `Invalid product id`,
 * `minPrice cannot be greater than maxPrice`. Offering "Try again" there invites the user to
 * repeat something that can only fail the same way; the fix is to change the request, not to
 * resend it.
 */
function isRetryable(error: unknown): boolean {
  return !(error instanceof ApiError && error.isClientError);
}

interface ErrorStateProps {
  error: unknown;
  title?: string;
  onRetry?: () => void;
}

export function ErrorState({ error, title = 'Could not load this', onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center"
    >
      <AlertTriangle className="size-8 text-destructive" aria-hidden />
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="max-w-prose text-sm text-muted-foreground">{errorMessage(error)}</p>
      </div>
      {onRetry && isRetryable(error) && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Optional recovery action — usually "clear filters". */
  children?: ReactNode;
}

export function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center">
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}
