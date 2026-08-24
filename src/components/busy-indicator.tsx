import { Loader2 } from 'lucide-react';

/**
 * The "this list is updating" cue.
 *
 * It replaces dimming the results with `opacity-60`, which dropped muted body text from
 * 4.74:1 to 2.3:1 — below WCAG AA — on every filter change and page turn. A separate
 * indicator says the same thing without touching the contrast of the content itself, and
 * `role="status"` means it is announced rather than being a purely visual signal.
 */
export function BusyIndicator({ label = 'Updating…' }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <Loader2 className="size-3.5 animate-spin" aria-hidden />
      {label}
    </span>
  );
}

/**
 * Wraps a skeleton so assistive technology hears that something is loading.
 *
 * The skeleton shapes themselves stay `aria-hidden` — a screen reader reading out a dozen
 * empty boxes is noise — but without this the whole load was silent: no announcement, then
 * content appearing unannounced.
 */
export function LoadingStatus({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div aria-hidden>{children}</div>
    </div>
  );
}
