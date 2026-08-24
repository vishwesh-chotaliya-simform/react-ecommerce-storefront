import { HttpResponse } from 'msw';

/**
 * The response envelope every endpoint uses, success or failure.
 *
 * Handlers build responses through these helpers rather than hand-writing JSON, so a test
 * cannot accidentally assert against a shape the real API never sends.
 */
export function ok<T>(data: T, message = 'Success', status = 200) {
  return HttpResponse.json({ success: true, message, data }, { status });
}

/**
 * A failure whose `message` is a flat string.
 *
 * This is the common case — `Product not found`, `Invalid email or password`.
 */
export function fail(status: number, message: string) {
  return HttpResponse.json({ success: false, message, data: null }, { status });
}

/**
 * A Zod rejection: every field error joined into **one string**.
 *
 * `"email: Invalid email address; password: Password must be at least 8 characters long"`.
 * The backend's `validate` middleware builds this by joining `path: message` with `'; '`,
 * so anything that parses field errors has to split it back apart.
 */
export function zodFail(fields: Record<string, string>, status = 400) {
  const message = Object.entries(fields)
    .map(([field, text]) => `${field}: ${text}`)
    .join('; ');

  return HttpResponse.json({ success: false, message, data: null }, { status });
}

/**
 * A Mongoose `ValidationError`: `message` is an **object keyed by field**, not a string.
 *
 * The one place the envelope's `message` is not a string. Kept distinct from
 * {@link zodFail} because the two shapes exercise different branches of the parser, and a
 * suite that only covered the joined string would miss half of it.
 */
export function mongooseFail(fields: Record<string, string>, status = 400) {
  return HttpResponse.json({ success: false, message: fields, data: null }, { status });
}
