import { ApiError } from './api-error';

/**
 * The API writes good error messages — "You can only review products you have purchased",
 * "Insufficient stock for …, only 2 left." Show them. Replacing them with "Something went
 * wrong" throws away the only thing that tells the user what to do next.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Please try again.';
}
