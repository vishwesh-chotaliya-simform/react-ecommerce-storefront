/** Field-keyed validation messages, e.g. `{ email: 'Invalid email address' }`. */
export type FieldErrors = Record<string, string>;

/**
 * A failed API response, normalised.
 *
 * The backend reports validation failures two different ways, both with status 400:
 *
 * - Zod rejections join every issue into one string —
 *   `"email: Invalid email address; password: Password must be at least 8 characters long"`
 * - Mongoose `ValidationError` sends an object keyed by field instead of a string.
 *
 * Both land in {@link ApiError.fields}. Everything else is a flat human-readable string in
 * {@link ApiError.message}, and those messages are good — show them to the user rather than
 * substituting a generic "Something went wrong".
 */
export class ApiError extends Error {
  readonly status: number;
  readonly fields: FieldErrors;

  constructor(status: number, message: string, fields: FieldErrors = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }

  /** True when the failure is the caller's fault and retrying unchanged will not help. */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** The message for `field`, if the server blamed that field specifically. */
  fieldError(field: string): string | undefined {
    return this.fields[field];
  }
}

/** Matches `fieldName: message` / `nested.path: message`, but not prose containing a colon. */
const FIELD_MESSAGE = /^([A-Za-z_][\w.]*(?:\[\d+\])?(?:\.[\w.]+)*): (.+)$/;

/**
 * Pull `field: message; field: message` pairs out of a joined Zod rejection.
 *
 * Segments that carry no field path (Zod issues with an empty `path`) are skipped rather than
 * failing the whole parse, and a message that merely happens to contain a colon —
 * `Insufficient stock for "Desk Lamp", only 2 left.` — yields nothing, because the part before
 * the colon has to look like an identifier.
 */
function parseFieldErrors(message: string): FieldErrors {
  const fields: FieldErrors = {};

  for (const segment of message.split('; ')) {
    const match = FIELD_MESSAGE.exec(segment.trim());
    if (match?.[1] && match[2]) {
      fields[match[1]] = match[2];
    }
  }

  return fields;
}

/** Build an `ApiError` from a decoded `{ success: false, message }` envelope. */
export function toApiError(status: number, message: unknown): ApiError {
  // Mongoose validation: an object keyed by field.
  if (message !== null && typeof message === 'object' && !Array.isArray(message)) {
    const fields: FieldErrors = {};

    for (const [field, text] of Object.entries(message as Record<string, unknown>)) {
      if (typeof text === 'string') fields[field] = text;
    }

    const summary = Object.entries(fields)
      .map(([field, text]) => `${field}: ${text}`)
      .join('; ');

    return new ApiError(status, summary || 'Validation failed', fields);
  }

  if (typeof message === 'string' && message.length > 0) {
    return new ApiError(status, message, parseFieldErrors(message));
  }

  return new ApiError(status, `Request failed with status ${status}`);
}
