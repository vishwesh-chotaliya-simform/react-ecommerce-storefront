# Build roadmap

Eight phases. The order is load-bearing — each depends on the one before. Every phase ends with
something you can open in a browser and use.

Full reference with rationale and code:
<https://claude.ai/code/artifact/29fc3eac-8e83-4b90-8692-19edb5a8e1e1>

API contracts, backend quirks, and stack decisions are in `../CLAUDE.md`. Read that first.

---

## Phase 0 — Foundation

Scaffold, tokens, and a typed client that speaks this API's dialect. No screens. The payoff is that
every later phase is boring.

- Vite + React 19 + TS, path alias `@/`
- Vite proxy `/api` → `http://localhost:3000`, rewriting away the prefix
- Tailwind v4 with `@theme` tokens; shadcn/ui initialised
- `src/lib/api-client.ts` — attaches the bearer token, unwraps the envelope, throws `ApiError`,
  parses `"field: msg; field: msg"` into `ApiError.fields`, handles 401 globally
- `src/lib/query-client.ts` — `staleTime` 30s, no retry on 4xx, no retry on mutations
- Typed query-key factory
- Route-level error boundaries
- ESLint + Prettier
- `"gen:api": "openapi-typescript docs/openapi.json -o src/lib/api-types.d.ts"` in `package.json`
  (`src/lib/api-types.d.ts` already exists — the scaffold must not overwrite or delete it)

**Done when:** the app renders a product grid from the live API with real data.

**Concepts:** provider composition, query keys, error boundaries.

---

## Phase 1 — Auth

Sign up, sign in, stay signed in, get thrown out cleanly.

- Signin / signup forms with RHF + Zod mirroring backend rules
- Zustand store holding the token, persisted to `localStorage`
- `ProtectedRoute` and role-gated `AdminRoute`
- Global 401 → clear session, `queryClient.clear()`, redirect, preserve intended path
- Bootstrap the session from `GET /users/me` on load
- Forgot / reset password using the OTP the API returns

`POST /users/signup` · `POST /users/signin` · `POST /users/signout` · `GET /users/me` ·
`POST /users/forgot-password` · `POST /users/reset-password`

**Snag:** clear the query cache on sign-out. `tokenVersion` invalidation is server-side and
instant, but TanStack Query still holds the previous user's cart and orders in memory.

**Concepts:** route guards, redirect-after-login, mutations that invalidate caches, mapping server
errors onto form fields.

---

## Phase 2 — Catalog

A browsable, filterable, linkable product list plus detail pages. The most React-heavy phase.

- Product grid with server pagination
- Debounced search, sort (`title` | `price` | `date`), price range
- **All filter state in the URL query string**
- Skeletons, empty state, error state
- Detail page with rating summary and review list

`GET /products` · `GET /products/:id` · `GET /products/:productId/reviews`

**Snag:** `minPrice` without `maxPrice` is a 400 — send both bounds or neither. `limit` caps at 100. Catalog search matches title only.

**Concepts:** `useSearchParams` as source of truth, `placeholderData: keepPreviousData` to stop
page-flicker, `useTransition`, prefetch on hover.

---

## Phase 3 — Cart

A cart that feels instant despite every mutation being a round trip.

- Cart drawer or page with line items
- Optimistic quantity stepper with rollback on error
- Header badge driven off the cart query
- Client-side stock ceiling before the request
- Totals computed from the response, never cached separately

`GET /cart` · `POST /cart` · `PATCH /cart/:productId` · `DELETE /cart/:productId` · `DELETE /cart`

**Snag:** no guest cart — `/cart` is authenticated. Decide now whether to gate "add to cart" behind
sign-in or keep a local cart and replay it after login; retrofitting a merge is painful. `POST /cart`
_adds to_ the existing quantity and returns `data: null`, so refetch.

**Concepts:** `onMutate` / `onError` / `onSettled` rollback, `useOptimistic`, cross-feature
invalidation.

---

## Phase 4 — Checkout

Addresses, then the transaction. Highest-stakes screen in the app.

- Address book CRUD with default selector
- 6-digit pincode validation matching the schema
- Review-and-place-order step
- Real UI for each 400: empty cart, no address, sold out
- Order confirmation screen

`GET|POST /users/me/addresses` · `PATCH|DELETE /users/me/addresses/:addressId` ·
`PATCH /users/me/addresses/:addressId/default` · `POST /orders`

**Snag:** guard the double-submit — two clicks means two orders. On "insufficient stock", refetch
the cart before showing the error; the message names the product and its remaining count.

**Concepts:** multi-step flow with guards, disabling submit during in-flight mutations, turning
specific server errors into recovery paths.

---

## Phase 5 — Orders & reviews

Post-purchase. Where purchase-gating becomes interesting UI logic.

- Paginated order history and order detail
- "Write a review" only on products actually ordered
- Star input; edit and delete your own review
- Review list with rating filter and sort
- My-reviews page

`GET /orders` · `GET /orders/:id` · `POST|PATCH|DELETE /products/:productId/reviews[/:reviewId]` ·
`GET /users/me/reviews`

**Snag:** there is no `canReview` flag. Cross-reference `/orders` against `/users/me/reviews`
client-side, and still handle the 403 and 409 as real states. Order items are price snapshots —
that is correct behaviour.

**Concepts:** deriving UI permissions from data you already hold, treating 409 as a state not a
crash, cross-feature invalidation (a review changes the product's `avgRating`).

---

## Phase 6 — Admin

A second app behind a role gate. Table-and-form work.

- Separate layout under `/admin`, role-gated
- Product table: sort, search, paginate
- Create / edit form reusing one Zod schema
- Soft-delete with confirmation
- Image URL field with live preview

`GET|POST /admin/products` · `PUT|DELETE /admin/products/:id`

**Snag:** admins see only their own products, so a second admin account starts empty even though
the catalog is full.

**Concepts:** role-based rendering, server-driven data tables, one form for create and edit.

---

## Phase 7 — Hardening

What separates a tutorial project from something you'd show an interviewer.

- MSW handlers built from the real envelope shape
- Vitest + RTL on cart maths and auth guards
- One Playwright run: signin → cart → checkout → review
- Route-level code splitting, admin in its own chunk
- React Compiler on; strip dead memoization
- Keyboard nav, focus traps, live regions on cart updates
- Deploy static; add the deployed origin to the backend's `ALLOWED_ORIGINS`

**Snag:** the backend's dev `.env` allows 1000 req/15min and 50 auth attempts. Production wants the
code defaults (100 and 10). Reuse Playwright storage state between tests or the auth limiter will
trip.

**Concepts:** testing at the network boundary, reading a bundle analysis, real a11y.

---

## Beyond v1

Each is a genuinely different skill, and all need backend work first:

- **Order lifecycle** — status enum + `PATCH /admin/orders/:id/status` + admin-scoped
  `GET /admin/orders`. Best value per hour on this list; unlocks tracking and fulfilment.
- **Real-time stock** — SSE or Socket.IO pushing into the query cache.
- **Image upload** — Multer or S3 presigned URLs, replacing the URL field.
- **Categories and facets** — a schema change that unlocks a whole class of browse UI.
- **Payments** — Stripe or Razorpay; webhooks make it a real backend problem.
- **SSR for product pages** — the only argument that would justify a meta-framework.
