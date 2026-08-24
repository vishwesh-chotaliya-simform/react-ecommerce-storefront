import { useEffect } from 'react';

const SITE = 'Storefront';

/**
 * Name the tab after the screen.
 *
 * A single-page app keeps whatever title `index.html` shipped with unless something changes
 * it, so every route, every history entry, and every bookmark read as "Storefront". Screen
 * readers announce the title on navigation too, which is the other half of why it matters.
 */
export function useDocumentTitle(title: string | undefined): void {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : SITE;
  }, [title]);
}
