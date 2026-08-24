import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// The API has no `/api` prefix — it serves `/products`, `/cart`, `/orders` at the root.
// In dev we proxy `/api/*` to it and strip the prefix, so app code can use one relative
// base URL that also works behind a reverse proxy in production.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.DEV_API_PROXY_TARGET ?? 'http://localhost:3000';

  return {
    plugins: [
      react({
        // The React Compiler memoizes automatically. Anything it refuses to compile is a
        // Rules-of-React violation worth fixing rather than silencing — `npm run lint`
        // surfaces the same diagnostics through eslint-plugin-react-hooks.
        babel: { plugins: [['babel-plugin-react-compiler', {}]] },
      }),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      rollupOptions: {
        output: {
          /**
           * Keep the Select stack out of the entry chunk.
           *
           * `@radix-ui/react-select` and its Floating UI dependencies are only used by
           * screens that are already lazy — catalog filters, the review list, the address
           * form, the admin table. Because three separate lazy chunks share it, Rollup
           * hoists it into the entry by default, so every visitor downloaded ~200 kB of
           * source for a dropdown they may never open. Nothing eager imports it, so naming
           * it here makes it an async chunk that loads with the first screen that needs one.
           *
           * Deliberately *not* including `react-slot` or `react-label`: `Button` and `Label`
           * use those on every page, so moving them would only rename bytes the entry still
           * has to fetch.
           */
          manualChunks(id: string) {
            const selectOnly = [
              '@radix-ui/react-select',
              '@radix-ui/react-popper',
              '@radix-ui/react-collection',
              '@radix-ui/react-dismissable-layer',
              '@radix-ui/react-focus-scope',
              '@radix-ui/react-focus-guards',
              '@radix-ui/react-portal',
              '@floating-ui/',
              'react-remove-scroll',
              'aria-hidden',
            ];

            if (selectOnly.some((pkg) => id.includes(pkg))) return 'ui-select';
            return undefined;
          },
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  };
});
