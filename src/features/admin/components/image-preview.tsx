import { ImageOff, Loader2 } from 'lucide-react';
import { useState } from 'react';

type LoadState = { url: string; status: 'loaded' | 'failed' };

/**
 * Live preview of an image URL.
 *
 * `imageURL` is a plain string the admin types — there is no upload and no validation beyond
 * "not empty" — so a typo, a dead host, or a hotlink-blocked URL is entirely normal.
 *
 * Four states, not two. A URL that fails outright fires `error` and is reported in words
 * rather than as the browser's broken-image glyph. But a host that simply never answers —
 * an unresolvable domain, a firewalled address — fires neither `load` nor `error`, and
 * without an explicit pending state that leaves an empty box that looks identical to a
 * preview that is not implemented.
 */
export function ImagePreview({ url, alt }: { url: string; alt: string }) {
  const trimmed = url.trim();
  // Keyed by URL so editing the field re-tests rather than latching on a previous verdict.
  const [load, setLoad] = useState<LoadState | null>(null);
  const status = load?.url === trimmed ? load.status : 'pending';

  if (!trimmed) {
    return (
      <Frame>
        <ImageOff className="size-6" aria-hidden />
        <span>No image URL yet</span>
      </Frame>
    );
  }

  if (status === 'failed') {
    return (
      <Frame>
        <ImageOff className="size-6" aria-hidden />
        <span>That URL did not load</span>
      </Frame>
    );
  }

  return (
    <div className="relative size-32 shrink-0">
      <img
        src={trimmed}
        alt={alt}
        onLoad={() => setLoad({ url: trimmed, status: 'loaded' })}
        onError={() => setLoad({ url: trimmed, status: 'failed' })}
        className="size-32 rounded-lg border bg-muted object-cover"
      />
      {status === 'pending' && (
        <div
          role="status"
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-muted/80 text-center text-xs text-muted-foreground"
        >
          <Loader2 className="size-5 animate-spin" aria-hidden />
          <span>Loading preview…</span>
        </div>
      )}
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="flex size-32 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-muted/40 p-2 text-center text-xs text-muted-foreground"
    >
      {children}
    </div>
  );
}
