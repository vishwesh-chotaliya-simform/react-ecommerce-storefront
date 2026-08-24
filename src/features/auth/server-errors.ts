import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { ApiError } from '@/lib/api-error';
import { errorMessage } from '@/lib/error-message';

/**
 * Move a rejected request onto the form that caused it.
 *
 * `ApiError.fields` already holds the parsed `email: …; password: …` pairs, so the work here
 * is only deciding where each one goes: a message naming a field the form owns is attached to
 * that input, and anything left over — `Invalid email or password`, `Email is already
 * registered` — is returned for the form-level alert, because there is no single input to
 * blame.
 *
 * Client-side validation mirrors the backend's schema, so in practice field errors only reach
 * this path when the two disagree. That is exactly when you want the server to win.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  formFields: readonly Path<T>[],
): string | null {
  if (!(error instanceof ApiError)) return errorMessage(error);

  const entries = Object.entries(error.fields);
  if (entries.length === 0) return error.message;

  let attached = 0;

  for (const [field, message] of entries) {
    if (!formFields.includes(field as Path<T>)) continue;
    setError(field as Path<T>, { type: 'server', message });
    attached += 1;
  }

  // Every message found a home — the inputs now say everything the banner would have.
  if (attached === entries.length) return null;

  return error.message;
}
