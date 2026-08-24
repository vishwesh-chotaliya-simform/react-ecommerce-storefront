import { z } from 'zod';

/**
 * Mirrors `../node-mongodb-ecommerce-project/src/modules/reviews/review.validation.ts`.
 *
 * Rules copied exactly — a whole-number rating of 1–5, a comment of 10–1000 characters, and an
 * optional title capped at 120. The wording is sentence-cased for use under an input; the
 * server phrases them as `comment must be at least 10 characters`, which reads as a field
 * name. Anything that slips past still returns as `ApiError.fields` and lands on the same
 * input.
 */
export const reviewSchema = z.object({
  rating: z
    .number('Choose a rating')
    .int('Rating must be a whole number')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5'),
  title: z.string().trim().max(120, 'Title must be at most 120 characters').optional(),
  comment: z
    .string()
    .trim()
    .min(10, 'Comment must be at least 10 characters')
    .max(1000, 'Comment must be at most 1000 characters'),
});

export type ReviewValues = z.infer<typeof reviewSchema>;

export const COMMENT_MIN = 10;
export const COMMENT_MAX = 1000;
export const TITLE_MAX = 120;
