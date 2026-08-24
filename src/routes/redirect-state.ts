/**
 * The "where was I heading?" hand-off between a guard and the sign-in screen.
 *
 * Lives apart from the guards themselves so that file exports only components — mixing a
 * helper in breaks fast refresh for every route boundary that imports it.
 */

/** Navigation state a guard attaches when it turns someone away. */
export interface RedirectState {
  from: string;
}

/**
 * Read the intended path out of navigation state.
 *
 * Narrowed rather than cast: `location.state` is typed `any` by React Router and is writable
 * by anyone who can call `history.pushState`, so its shape is an assumption, not a fact. The
 * The scheme-relative checks matter: `//evil.example` is off-site, and so is `/\evil.example`
 * — browsers normalise the backslash, so `new URL('/\evil.example', origin)` resolves to
 * `http://evil.example/` and `history.pushState` then throws a `SecurityError` that would take
 * the screen down.
 */
export function intendedPath(state: unknown, fallback = '/'): string {
  if (typeof state !== 'object' || state === null) return fallback;

  const { from } = state as Partial<RedirectState>;
  if (typeof from !== 'string' || !from.startsWith('/')) return fallback;
  if (/^\/[/\\]/.test(from)) return fallback;

  return from;
}
