import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router';

import { SiteHeader } from '@/components/layout/site-header';

export function RootLayout() {
  const { pathname } = useLocation();
  const main = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);

  /**
   * Move focus to the new screen after a client-side navigation.
   *
   * Without this, focus stays wherever the clicked link was — or on `<body>` — so keyboard
   * and screen-reader users start every new page from the top of the document again, and
   * hear nothing about having arrived. Skipped on first render so a cold load does not yank
   * focus away from the browser chrome.
   */
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    main.current?.focus();
  }, [pathname]);

  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>

      <SiteHeader />

      <main
        id="main"
        ref={main}
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 outline-none sm:px-6"
      >
        <Outlet />
      </main>
    </div>
  );
}
