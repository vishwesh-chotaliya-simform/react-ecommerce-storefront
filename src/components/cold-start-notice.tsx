/**
 * Explains a long first load rather than leaving the visitor staring at skeletons.
 *
 * The API is on a free tier that suspends after about fifteen minutes of inactivity, and the
 * first request afterwards has to wait for the container to start — up to a minute. That is
 * indistinguishable from a broken deployment unless the page says so, and the people most
 * likely to hit it are exactly the ones being shown the project for the first time.
 *
 * Gated on elapsed time rather than an environment flag: locally the API answers in
 * milliseconds, so the threshold is never reached and this never renders.
 */
export function ColdStartNotice() {
  return (
    <div
      role="status"
      className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground"
    >
      <p className="font-medium text-foreground">Waking the server…</p>
      <p className="mt-1">
        The API runs on a free tier that sleeps when idle. The first request after a quiet spell can
        take up to a minute — after that everything is quick.
      </p>
    </div>
  );
}
