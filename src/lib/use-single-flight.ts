import { useRef } from 'react';

export interface SingleFlight {
  /** Runs `action` unless one is already in flight. `action` must call `release` when done. */
  run: (action: () => void) => void;
  release: () => void;
}

/**
 * A synchronous "one at a time" latch for non-idempotent actions.
 *
 * `isPending` on a mutation disables its button, but two clicks can land in the same frame
 * before React has re-rendered — and for `POST /cart` a slipped second click is a second unit,
 * while for `POST /orders` it is a second order. A ref closes that window immediately, without
 * waiting for a render.
 *
 * Shared rather than hand-rolled per screen: a copy that forgets to release the latch leaves
 * the button dead for the rest of the session, and that is a quiet bug to ship twice.
 *
 * Exposed as arrow properties, not methods, so `onSettled: singleFlight.release` stays safe
 * to pass around detached from the object.
 *
 * No `useMemo` around the returned object: the React Compiler memoizes it, and hand-written
 * memoization it would only redo is noise.
 */
export function useSingleFlight(): SingleFlight {
  const inFlight = useRef(false);

  return {
    run: (action: () => void) => {
      if (inFlight.current) return;
      inFlight.current = true;
      action();
    },
    release: () => {
      inFlight.current = false;
    },
  };
}
