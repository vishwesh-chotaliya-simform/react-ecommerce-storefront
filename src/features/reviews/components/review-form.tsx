import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { FormAlert } from '@/features/auth/components/form-alert';
import { applyServerErrors } from '@/features/auth/server-errors';

import { useCreateReview, useUpdateReview } from '../api';
import { COMMENT_MAX, COMMENT_MIN, TITLE_MAX, reviewSchema, type ReviewValues } from '../schemas';
import type { CreateReviewBody, Review } from '../types';
import { StarInput } from './star-input';

const FIELDS = ['rating', 'title', 'comment'] as const;

interface ReviewFormProps {
  productId: string;
  /** Present when editing; absent when writing a new one. */
  review?: Pick<Review, '_id' | 'rating' | 'title' | 'comment'>;
  onDone: () => void;
  onCancel?: () => void;
}

/**
 * Write or edit a review.
 *
 * Owns its mutation, like the auth forms: that keeps the server's field errors and the form
 * that produced them in one place, so `rating`/`title`/`comment` rejections land on their own
 * inputs instead of being flattened into a banner by whichever screen happened to call it.
 */
export function ReviewForm({ productId, review, onDone, onCancel }: ReviewFormProps) {
  const create = useCreateReview();
  const update = useUpdateReview();
  const mutation = review ? update : create;

  const form = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: review?.rating ?? 0,
      title: review?.title ?? '',
      comment: review?.comment ?? '',
    },
  });

  const formError = form.formState.errors.root?.message;
  // `useWatch` rather than `form.watch()`: the latter returns a function the React Compiler
  // cannot memoize, so it silently skips compiling this whole component.
  const comment = useWatch({ control: form.control, name: 'comment' });

  function handleSubmit(values: ReviewValues) {
    form.clearErrors('root');

    const body: CreateReviewBody = { rating: values.rating, comment: values.comment };
    // Left out rather than sent empty — `title` is optional server-side.
    if (values.title) body.title = values.title;

    const onError = (error: unknown) => {
      // A 403 ("not purchased") and a 409 ("already reviewed") are states, not field errors:
      // the cross-reference that decided to show this form can be stale, and the server is
      // the one that actually knows.
      const message = applyServerErrors(error, form.setError, FIELDS);
      if (message) form.setError('root', { message });
    };

    if (review) {
      update.mutate({ productId, reviewId: review._id, body }, { onSuccess: onDone, onError });
    } else {
      create.mutate({ productId, body }, { onSuccess: onDone, onError });
    }
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}
        className="space-y-5"
      >
        {formError && <FormAlert message={formError} />}

        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rating</FormLabel>
              <FormControl>
                <StarInput
                  value={field.value || undefined}
                  onChange={field.onChange}
                  disabled={mutation.isPending}
                  name={review ? `rating-${review._id}` : 'rating-new'}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title (optional)</FormLabel>
              <FormControl>
                <Input maxLength={TITLE_MAX} placeholder="Sums it up in a few words" {...field} />
              </FormControl>
              <FormDescription>At most {TITLE_MAX} characters.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="comment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your review</FormLabel>
              <FormControl>
                <textarea
                  rows={5}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
                  placeholder="What did you make of it?"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {comment.trim().length}/{COMMENT_MAX} — at least {COMMENT_MIN} characters.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : review ? 'Save changes' : 'Post review'}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={mutation.isPending}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
