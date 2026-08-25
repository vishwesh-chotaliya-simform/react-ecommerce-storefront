import { useEffect, useState } from 'react';

/** How long a load may run before it stops looking like latency and starts looking broken. */
const SLOW_AFTER_MS = 3_000;

/**
 * True once `active` has stayed true for {@link SLOW_AFTER_MS} without a break.
 *
 * The reset lives in the cleanup rather than the effect body: clearing it synchronously on
 * every inactive render is a cascading-render smell the lint rules reject, and cleanup runs at
 * exactly the moment that matters — when `active` flips off — so a fast load never trips the
 * flag and a later slow load gets the full grace period instead of inheriting a stale `true`.
 */
export function useSlowLoad(active: boolean, delayMs: number = SLOW_AFTER_MS): boolean {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!active) return;

    const timer = setTimeout(() => setSlow(true), delayMs);

    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [active, delayMs]);

  return slow;
}
