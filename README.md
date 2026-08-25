# React E-commerce Storefront

A React 19 single-page storefront and role-gated admin dashboard, built against the existing
Express/MongoDB e-commerce API in `../node-mongodb-ecommerce-project`.

The backend was inherited as-is and treated as read-only: every quirk below is worked around in
the client rather than patched in the API. `docs/PROJECT-WRITEUP.md` tells that story;
`CLAUDE.md` is the working reference for contracts and conventions.

| | |
| --- | --- |
| Stack | React 19.2 · TypeScript (strict) · Vite 7.3 · TanStack Query 5 · React Router 7 · Tailwind v4 · shadcn/ui |
| Tests | 34 passing — 29 Vitest/RTL + 5 Playwright |
| Main chunk | 110.72 kB gzip |
| Status | All 8 roadmap phases complete |

## What it does

**Storefront**

- Browse a paginated catalog with debounced search, sorting and a price range — every filter
  lives in the URL, so a filtered view is shareable and the Back button steps through changes
- Product detail with a rating summary and a review list that paginates, filters by rating and
  sorts
- A cart whose quantity stepper moves instantly and rolls back on rejection, with a header
  badge and totals derived from the server's own line items
- Checkout with an address book, order placement inside a single transaction, and a
  confirmation showing the price actually paid
- Order history, order detail with the shipping address as it was at purchase, and reviews you
  can only write for products you bought

**Admin** (`/admin`, role-gated)

- Product table with server-side search, sort and pagination
- One form and one Zod schema for both create and edit, with a live image-URL preview
- Soft delete with confirmation — it removes the product from the shop and from every
  customer's cart, and cannot be undone

## Running it

The API must be up first. In a separate terminal:

```bash
cd ../node-mongodb-ecommerce-project
npm run db:start    # single-node replica set on :27018 — checkout's transaction needs it
npm run dev         # http://localhost:3000
npm run seed        # 12 products + demo accounts
```

Then:

```bash
npm install
npm run dev         # http://localhost:5173
```

Seeded logins: `admin@shop.dev` / `Admin@12345` and `customer@shop.dev` / `Cust@12345`.

Vite proxies `/api/*` to the API and strips the prefix — the backend serves `/products`, not
`/api/products`. Set `DEV_API_PROXY_TARGET` if the API is not on port 3000, and `VITE_API_URL`
to point a production build at a deployed origin.

## Scripts

| Script | What |
| --- | --- |
| `npm run dev` | Dev server on :5173 |
| `npm run build` | Typecheck, then production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Vitest + RTL + MSW, once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright journey (starts the dev server if needed) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint, type-aware, including the React Compiler's rules |
| `npm run format` / `npm run format:check` | Prettier |
| `npm run gen:api` | Regenerate `src/lib/api-types.d.ts` from `docs/openapi.json` |

## Testing

**Unit and integration** — Vitest, Testing Library and MSW. Tests run against the network
boundary: components call the real API client, and MSW answers with the real response envelope,
so envelope unwrapping and error parsing are exercised rather than stubbed past. Coverage
targets the parts most likely to break quietly — both server error shapes, cart maths, the
optimistic rollback (including that a failed update does not rewind a concurrent successful
one), the route guards, and the redirect-back-after-signin path.

**End to end** — one Playwright journey: sign in → browse → add to cart → checkout → review.

Two constraints from the real backend shape that setup, both handled in `e2e/global-setup.ts`:

- **The API allows 50 sign-ins per 15 minutes.** The suite signs in once in `globalSetup` and
  reuses the saved `storageState`; no test authenticates on its own.
- **There is no test database.** Checkout really decrements stock and empties the cart, so
  `globalSetup` re-seeds the backend and the suite runs serially with a single worker.

`npx playwright install chromium` is needed once before the first e2e run.

## How it is put together

```
src/
├── lib/         api-client, api-error, query-client, query-keys, generated api-types
├── features/    addresses, admin, auth, cart, catalog, orders, reviews
├── components/  ui (shadcn), layout, shared empty/error/loading states
├── routes/      route tree, lazy boundaries, guards
└── test/        MSW handlers, envelope helpers, render utilities
```

Four rules hold the structure together:

1. **Server state is not client state.** Products, cart, orders and the user profile live in
   TanStack Query. Zustand holds the bearer token and nothing else.
2. **A feature owns its queries.** Every hook touching `/cart` lives in `features/cart/api.ts`.
   Components import hooks; nothing outside `src/lib` imports the API client.
3. **Query keys come from a typed factory**, never inlined, so invalidation cannot silently
   stop matching.
4. **Types are derived from the API spec**, not hand-written — `src/lib/api-types.d.ts` is
   generated and must not be edited by hand.

## Decisions worth knowing

- **One envelope, two error shapes.** Every response is `{ success, message, data }`. Failures
  arrive either as a joined string (`"email: Invalid email address; password: …"`) or, for
  Mongoose validation, as an object keyed by field. `ApiError` normalises both into `.fields`
  so messages land on the right input — and the server's wording is shown, not replaced.
- **Optimistic cart writes undo only their own change.** Rolling back by restoring a
  whole-list snapshot looks equivalent but rewinds edits the user made — and the server
  accepted — while the failed request was still in flight.
- **Order lines are snapshots.** An order showing a price the catalog no longer charges is
  correct; joining back to the live product to "fix" it would be the bug.
- **Reviews are purchase-gated without a `canReview` flag.** Eligibility is derived by
  cross-referencing orders against your own reviews — a hint, not a gate, so the server's 403
  and 409 are still handled as real states.
- **Admins only see products they created.** `/admin/products` filters by `userId`, so the
  empty state says so explicitly rather than looking like a broken page.
- **The React Compiler is enabled** with no Rules-of-React violations, and manual memoization
  has been removed.

## Documentation

| Path | What |
| --- | --- |
| `CLAUDE.md` | API contracts, backend quirks, stack decisions, conventions |
| `docs/PROJECT-WRITEUP.md` | How the project was built, and the React concepts it covers |
| `docs/DEPLOYMENT.md` | Free-tier deployment: Atlas, Render, Vercel |
| `docs/ROADMAP.md` | The eight build phases |
| `docs/PROMPTS.md` | Per-phase session prompts and acceptance checks |
| `docs/openapi.json` | Spec extracted from the backend's `openApiDocument` |

## Deploying

`dist/` is a static bundle, so any static host will serve it. Two things to set:

- `VITE_API_URL` to the deployed API origin — the Vite proxy only exists in dev
- the deployed origin added to the backend's `ALLOWED_ORIGINS`, or CORS will reject the browser

## Regenerating API types

See the "Generated API types" section of `CLAUDE.md`. Short version: re-extract
`docs/openapi.json` from the backend, then `npm run gen:api`.
