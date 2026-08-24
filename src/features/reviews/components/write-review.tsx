import { PenLine } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from '@/features/auth/use-session';

import { ReviewForm } from './review-form';
import { useReviewEligibility } from '../use-review-eligibility';

/**
 * The "write a review" affordance, shown only when the cross-reference says it applies.
 *
 * The gate is deliberately quiet: someone who has not bought the product sees nothing at all
 * rather than a button that exists to be refused. The refusal path still exists — the form
 * surfaces the server's 403 and 409 — because this answer is derived from paginated data and
 * can be out of date.
 */
export function WriteReview({ productId }: { productId: string }) {
  const { isAuthenticated } = useSession();
  const { canReview, isLoading, myReview } = useReviewEligibility(productId);
  const [isWriting, setIsWriting] = useState(false);

  if (!isAuthenticated || isLoading) return null;

  // Already reviewed: the review itself is in the list below, with its own edit control.
  if (myReview) return null;
  if (!canReview) return null;

  if (!isWriting) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-4">
        <p className="text-sm text-muted-foreground">You bought this. How did it go?</p>
        <Button onClick={() => setIsWriting(true)}>
          <PenLine aria-hidden />
          Write a review
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Write a review</CardTitle>
      </CardHeader>
      <CardContent>
        <ReviewForm
          productId={productId}
          onDone={() => setIsWriting(false)}
          onCancel={() => setIsWriting(false)}
        />
      </CardContent>
    </Card>
  );
}

/** Shown on a product nobody signed in can review — keeps the sign-in path discoverable. */
export function ReviewSignInPrompt() {
  return (
    <p className="text-sm text-muted-foreground">
      <Link to="/signin" className="text-foreground underline underline-offset-4">
        Sign in
      </Link>{' '}
      to review products you have bought.
    </p>
  );
}
