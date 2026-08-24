# Session prompts

One phase per session. Each phase: prompt → check → next session.

Everything about the API is in `CLAUDE.md`, which Claude loads automatically. The prompts do not
repeat any of it.

In any session, give Claude read access to the backend so it can check real endpoint behaviour
instead of guessing:

```
/add-dir ../node-mongodb-ecommerce-project
```

---

## Phase 0 — Foundation

```
Read CLAUDE.md and docs/ROADMAP.md, then implement Phase 0 only.

The backend is already running on http://localhost:3000 with 12 seeded products — verify
with `curl -s localhost:3000/products?limit=2` before you start, and stop and tell me if
it isn't up.

Scaffold into this existing directory rather than creating a subfolder. src/lib/api-types.d.ts
is generated and must survive the scaffold — check it is still intact when you're done.

Phase 0 is done when `npm run dev` renders a grid of the real seeded products, with
`npx tsc --noEmit` and `npm run lint` both clean. Don't start Phase 1.
```

### Checking Phase 0

Phase 0 is plumbing — a rendering product grid proves the happy path and nothing else. These are
the things that pass silently now and cost you a day in Phase 3.

**Run these.** With the dev server up:

```bash
# 1. The generated types survived the scaffold (~2400 lines, not deleted)
wc -l src/lib/api-types.d.ts && git status --short src/lib/api-types.d.ts

# 2. React 19, not 18
node -p "require('./package.json').dependencies.react"

# 3. Tailwind v4, not v3 — v4 is CSS-first, so a JS config file is a red flag
ls tailwind.config.* 2>/dev/null && echo "^ v3-style config, should not exist"
grep -rn "@theme" src/ | head -3        # expect a hit
grep -rn "@tailwindcss/vite" vite.config.ts

# 4. gen:api wired up
node -p "require('./package.json').scripts['gen:api']"

# 5. Clean
npx tsc --noEmit && npm run lint

# 6. The proxy actually strips /api  ← highest-value check
curl -s "localhost:5173/api/products?limit=1" | head -c 120
```

Check 6 has three distinct outcomes:

| Response | Meaning |
| --- | --- |
| `{"success":true,...}` | Correct |
| `<!doctype html>` | Proxy isn't matching `/api` at all |
| `API endpoint not found: GET /api/products` | Proxy matches but `rewrite` isn't stripping the prefix |

**Read these.** Four files, five minutes:

- `src/lib/api-client.ts` — does it `return body.data`, or hand back the whole envelope? Does the
  401 branch clear the session *and* call `queryClient.clear()`? Is there a parser turning
  `"email: Invalid; password: Too short"` into `ApiError.fields`?
- `src/lib/query-client.ts` — `retry` must return `false` for 4xx. Without it, every 404 and 403
  fires three requests, and the auth rate limiter will bite in Phase 1.
- `vite.config.ts` — proxy target, `changeOrigin`, and the `rewrite` that removes `/api`.
- Grep the boundary that keeps the app testable later:
  ```bash
  grep -rn "api-client" src/features src/components 2>/dev/null   # expect no hits
  grep -rn "\.data\.data" src/                                    # expect no hits
  ```

**Then actually use it.** Open the app, hard-reload, resize to mobile width. Open devtools →
Network, load a URL like `/products/bogus-id`, and confirm you see *one* failed request, not three.

The 401 path can't be genuinely exercised until Phase 1 — there's no way to hold a bad token yet.
Read it now, trust it in Phase 1.

---

## Phase 1 — Auth

```
Read CLAUDE.md and docs/ROADMAP.md. Implement Phase 1 (Auth) only.

Follow the patterns Phase 0 established: same feature folder layout, the query-key factory,
ApiError from src/lib. Components call hooks from features/auth/api.ts — nothing outside
src/lib imports api-client directly.

Mirror the backend's Zod rules exactly in the form schemas. Read
../node-mongodb-ecommerce-project/src/modules/users/user.validation.ts rather than guessing.

Phase 1 is done when all of these are true, and I want you to verify each one yourself
against the running backend before you tell me it's done:

  1. Sign up creates a customer and signs them in.
  2. Sign in as customer@shop.dev / Cust@12345 works, and a wrong password shows the
     server's own message, not a generic one.
  3. A field-level error from the server lands on the right input — try signing up with
     email "bad" and password "short" and confirm both messages attach to their fields.
  4. After a full page reload I am still signed in, with my name from GET /users/me.
  5. Visiting a protected route signed out redirects to sign-in, and after signing in I
     land back on the route I originally asked for.
  6. Sign-out clears the token AND calls queryClient.clear().
  7. An admin sign-in (admin@shop.dev / Admin@12345) can reach an admin-gated route that
     a customer cannot.

Don't start Phase 2.
```

### Checking Phase 1

The acceptance list above is the check — walk it yourself rather than taking Claude's word. Two
extra things worth doing:

- **Prove the 401 path.** Sign in, then in devtools corrupt the persisted token in `localStorage`
  and reload. You should be bounced to sign-in cleanly, not stuck on a spinner or a crash.
- **Prove the cache clear.** Sign in as the customer, sign out, sign in as the admin. If you see
  any flash of the customer's data, `queryClient.clear()` isn't wired to sign-out.

---

## Phase 2 — Catalog

Phase 0 already left `useProducts` with `keepPreviousData`, a `MAX_PAGE_SIZE` of 100, and a
`toQueryParams` that drops a lone price bound. Phase 2 builds the screens on top of that.

```
Read CLAUDE.md and docs/ROADMAP.md. Implement Phase 2 (Catalog) only.

Follow the patterns features/auth established: types derived from src/lib/api-types.d.ts,
queries in the feature's api.ts, keys from the query-key factory, ApiError for failures.
features/catalog/api.ts already has useProducts and useProduct — extend them, don't
replace them.

The reviews list on the detail page supports page, limit, rating, and
sortBy=newest|rating_high|rating_low. Check
../node-mongodb-ecommerce-project/src/modules/reviews/review.service.ts rather than
guessing at the shape.

Phase 2 is done when all of these are true, and I want you to verify each one yourself
in a browser against the running backend before you tell me it's done:

  1. Filters live in the URL — copy the address bar into a new tab and the exact same
     result set comes back.
  2. The browser Back button steps back through filter changes.
  3. Changing any filter resets to page 1.
  4. Paging never blanks the grid back to skeletons.
  5. Typing "keyboard" fires ONE request, not one per keystroke.
  6. Setting only a min price never fires a request at all — the API 400s on a lone bound.
  7. A search with no matches shows an empty state, not a spinner and not an error.
  8. /products/<garbage-id> shows the server's own message, not a crash or a blank page.
  9. The detail page shows avgRating and reviewCount, and its review list paginates,
     filters by rating, and sorts.

Don't start Phase 3.
```

### Checking Phase 2

Items 1–9 above are the check — walk them. The two that are easy to fake and worth watching in
devtools → Network:

- **Debounce (5).** Type a word and count the requests. One per keystroke means the debounce is
  on the wrong side of the state update.
- **Lone price bound (6).** `toQueryParams` already guards this, but a new filter component can
  easily bypass it by building its own params. Watch for a request carrying `minPrice` without
  `maxPrice` — the response will be a 400.

Also worth a look: with `staleTime` at 30s, paging forward and back should serve the earlier page
from cache with no request at all.

---

## Phase 3 — Cart

### One decision to make first

`/cart` is authenticated and there is no guest cart on the backend. Two options, and the prompt
below assumes the first:

- **Gate "Add to cart" behind sign-in** (recommended). Phase 1 already built the redirect that
  remembers where you were headed, so this is a few lines and it reuses machinery you have.
- **Keep a local guest cart and replay it after login.** Teaches more, but means a merge path,
  reconciling stock at merge time, and a second source of truth. If you want this instead, swap
  criterion 7 for: *a signed-out user can add to a local cart, and after signing in those items
  appear in the server cart exactly once.*

### Verified endpoint behaviour

These were checked against the running API — the prompt depends on them being right:

| Call | Returns | Note |
| --- | --- | --- |
| `GET /cart` | `[{ product: {_id,title,price,imageURL,stock}, quantity }]` | Deleted products are filtered out server-side |
| `POST /cart` | `data: null` | **Adds to** the existing quantity |
| `PATCH /cart/:productId` | `data: null` | **Sets** the quantity |
| `DELETE /cart/:productId` | `data: null` | |
| `DELETE /cart` | `data: []` | The one endpoint that returns `[]` rather than `null` |

`quantity` must be a positive integer — `0` is rejected with `quantity: Quantity must be a
positive integer`, which `ApiError.fields` parses as a field error. Over-stock is
`Requested quantity exceeds available stock`, with no field prefix, so it belongs in a
form-level or line-level alert.

### The prompt

```
Read CLAUDE.md and docs/ROADMAP.md. Implement Phase 3 (Cart) only.

Follow the patterns in features/catalog and features/auth: types derived from
src/lib/api-types.d.ts, queries in the feature's api.ts, keys from the query-key factory,
ApiError for failures. Nothing outside src/lib imports api-client directly.

Signed-out users are sent to sign-in when they try to add to the cart — reuse the
redirect-back machinery ProtectedRoute and intendedPath already provide. Do not build a
local guest cart.

Read ../node-mongodb-ecommerce-project/src/modules/cart/ for real behaviour rather than
guessing. Note especially that POST /cart ADDS to the existing quantity while PATCH SETS
it, that both return data: null so the cart must be refetched, and that quantity 0 is
rejected — removing a line is a DELETE, not a PATCH to 0.

Phase 3 is done when all of these are true, and I want you to verify each one yourself in
a browser against the running backend before you tell me it's done:

  1. The quantity stepper moves the number immediately, before the request lands.
  2. A rejected update rolls the number back to what it was and shows the server's own
     message.
  3. Raising quantity past stock shows "Requested quantity exceeds available stock".
  4. Stepping quantity down to zero removes the line — the API rejects a quantity of 0,
     so this must be a DELETE.
  5. Adding the same product twice raises its quantity instead of creating a second line.
  6. The header badge updates after every cart change without a page reload.
  7. Signed out, "Add to cart" sends me to sign-in and returns me to the product I was on.
  8. The cart total matches the server's line items and is recomputed after every change —
     it is never stored separately.
  9. Double-clicking "Add to cart" does not add the item twice.
 10. Emptying the cart shows an empty state with a route back to the catalog.

Don't start Phase 4.
```

### Checking Phase 3

Walk items 1–10. The three that are easy to get subtly wrong:

- **Rollback (2).** Force it: set a product's stock low in the DB, then try to exceed it. The
  number must return to its previous value, not to zero and not to the rejected value.
- **Additive POST (5).** The classic bug is treating `POST /cart` as "set quantity", which makes
  the number jump unpredictably when a product is already in the cart.
- **Double-submit (9).** `mutations: { retry: false }` is already set in `query-client.ts`, which
  covers automatic retries but not a user clicking twice. That needs the button disabled while
  the mutation is in flight.

Also worth watching: with optimistic updates, `onSettled` must invalidate the cart query — both
mutating endpoints return `data: null`, so the real state only arrives on refetch.

---

## Phase 4 — Checkout

The highest-stakes phase: `POST /orders` runs a real MongoDB transaction that decrements stock,
creates the order, and clears the cart. A duplicate submit is a duplicate order.

### Verified endpoint behaviour

Checked against the running API:

| Call | Returns | Note |
| --- | --- | --- |
| `GET /users/me/addresses` | a plain **array** | Not paginated — unlike products and orders |
| `POST /users/me/addresses` | the created address | `isDefault: true` unsets the previous default **server-side** |
| `PATCH /users/me/addresses/:id/default` | updated address | |
| `DELETE /users/me/addresses/:id` | | Deleting the default **promotes another** server-side |
| `POST /orders` | the created order | Body is only `{ addressId }` — it orders the whole cart |

Because the server owns default-address promotion in both directions, the client must refetch
rather than predict it.

Order rejections, in the order they win:

| Situation | Message |
| --- | --- |
| No addresses saved at all | `You have no saved addresses. Please add an address before placing an order.` |
| Valid address, empty cart | `Cart is empty. Add items before placing an order.` |
| Malformed address id | `Invalid address id` |
| Well-formed but unknown id | `Address not found` |
| Stock gone since it was added | `Insufficient stock for "…", only N left.` |

### The prompt

```
Read CLAUDE.md and docs/ROADMAP.md. Implement Phase 4 (Checkout) only.

Follow the patterns in features/cart, features/catalog, and features/auth: types derived
from src/lib/api-types.d.ts, queries in the feature's api.ts, keys from the query-key
factory, ApiError for failures.

Read ../node-mongodb-ecommerce-project/src/modules/addresses/ and .../orders/ for real
behaviour. Note that GET /users/me/addresses returns a plain array rather than a paginated
object, that the server handles unsetting the old default and promoting a new one when the
default is deleted — so refetch rather than predicting it — and that POST /orders takes
only { addressId } and orders the entire cart inside a transaction.

Placing an order changes three things at once: the cart is emptied, an order is created,
and product stock is decremented. Invalidate all three — a catalog still showing the old
stock count after checkout is the bug this phase is most likely to ship.

Phase 4 is done when all of these are true, and I want you to verify each one yourself in
a browser against the running backend before you tell me it's done:

  1. I can add an address; pincode must be 6 digits and the form says so before submitting.
  2. Marking an address default visibly unsets the previous one.
  3. Deleting the default address promotes another, and the UI reflects that.
  4. Placing an order empties the cart, shows a confirmation with the ordered lines, and
     the header badge drops to zero.
  5. The catalog shows the reduced stock immediately after checkout, without a reload.
  6. Checking out with an empty cart shows the server's message and a route to the catalog.
  7. Checking out with no saved address shows the server's message and a route to add one.
  8. Clicking "Place order" twice never creates two orders.
  9. If stock runs out between adding to cart and checking out, the cart is refetched
     before the error is shown, so I can see what changed.
 10. The confirmation shows the price that was paid, from the order's own snapshot — not
     the product's current price.

Don't start Phase 5.
```

### Checking Phase 4

Items 1–10. The three worth forcing rather than hoping for:

- **Double-submit (8).** The real test is a fast double-click, not two deliberate clicks. Then
  check `GET /orders` — if there are two, the button was not disabled on the first mutation.
- **Stock race (9).** Add an item to the cart, then drop that product's stock below your
  quantity directly in Mongo, then check out. You should see
  `Insufficient stock for "…", only N left.` and a cart that has refreshed to show reality.
- **Stale stock (5).** Buy the last unit of something, then go back to the catalog. If it still
  says the old count, the order mutation did not invalidate the products query.

Worth knowing: the whole order is atomic server-side, so a failed checkout leaves stock and cart
exactly as they were. You never need to write compensating logic on the client.

---

## Phase 5 — Orders & reviews

### Verified endpoint behaviour

| Call | Returns / behaviour |
| --- | --- |
| `GET /orders` | `{ orders, pagination }` — paginated |
| `GET /orders/:id` | one order; items are **snapshots** of title/price/image at purchase time |
| `GET /users/me/reviews` | `{ reviews, pagination }` — paginated (note: addresses are *not*) |
| `POST /products/:productId/reviews` | 403 `You can only review products you have purchased` |
| | 409 `You have already reviewed this product` |
| `PATCH`/`DELETE .../reviews/:reviewId` | 403 `You can only modify your own review` |

Two behaviours that shape the UI:

- **There is no `canReview` flag.** The server checks for a matching order and refuses otherwise.
  The client has to cross-reference `/orders` against `/users/me/reviews` to decide whether to
  offer the button — and still handle the 403 and 409, because that cross-reference can be stale.
- **Deleting a review frees you to write another.** The unique index is partial
  (`partialFilterExpression: { isDeleted: false }`), so a soft-deleted review no longer blocks a
  new one. "Delete" is therefore not permanent in the user's eyes — it is "start over".

Writing, editing, and deleting a review all adjust the product's `reviewCount`, `ratingSum`, and
`avgRating` server-side, so the product queries go stale on every review mutation.

### The prompt

```
Read CLAUDE.md and docs/ROADMAP.md. Implement Phase 5 (Orders & reviews) only.

Follow the patterns in features/orders, features/cart, and features/catalog. features/reviews
already has a read-only list, its types, and URL param handling — extend it rather than
starting again.

Read ../node-mongodb-ecommerce-project/src/modules/reviews/ for real behaviour. Note there
is no canReview flag: decide whether to offer the button by cross-referencing GET /orders
against GET /users/me/reviews, and still handle the 403 and 409 as real states because that
cross-reference can be stale. Note also that review deletion is soft and its unique index is
partial, so deleting a review lets the user write a new one.

Every review mutation changes the product's avgRating and reviewCount server-side, so the
product queries must be invalidated alongside the review queries.

Phase 5 is done when all of these are true, and I want you to verify each one yourself in a
browser against the running backend before you tell me it's done:

  1. Order history paginates, newest first, and each row shows the price actually paid.
  2. Order detail shows the shipping address as it was at purchase time.
  3. "Write a review" appears only on products I have ordered and not already reviewed.
  4. The review form enforces the backend's rules before submitting: rating is a whole
     number 1-5, comment 10-1000 characters, title optional and at most 120.
  5. Submitting a review updates that product's average rating and review count on the
     detail page without a reload.
  6. I can edit my own review, and the average updates to match.
  7. Deleting my review removes it, lowers the count, and afterwards I can write a new one.
  8. Attempting to review something I have not bought shows the server's own message.
  9. Somebody else's review shows no edit or delete controls.
 10. The my-reviews page paginates and each entry links back to its product.

Don't start Phase 6.
```

### Checking Phase 5

Items 1–10. The three worth forcing:

- **Stale cross-reference (3/8).** Open a product in two tabs, review it in one, then use the
  other tab's still-visible button. The 409 must render as a message, not a crash.
- **Aggregate drift (5/6/7).** Watch `avgRating` through write → edit → delete. If the number
  only refreshes on a hard reload, the review mutations are not invalidating the product queries.
- **Delete then re-review (7).** The one most likely to be got wrong, because the obvious
  assumption is that a deleted review blocks forever.

---

## Phase 6 — Admin

### Verified endpoint behaviour

Four things differ from the storefront and will silently produce a wrong UI if assumed:

| Behaviour | Storefront | Admin |
| --- | --- | --- |
| `sortBy` | `title` \| `price` \| `date` | **`title` only** — anything else falls back to `createdAt` |
| `search` | title only | title **and description** |
| Product shape | `userId`/`isDeleted` stripped | raw document, including `userId`, `isDeleted`, `__v`, `ratingSum` |
| Scope | whole catalog | **only products this admin created** |

So an admin table must not offer a Price column sort: the server accepts the param and ignores
it, which reads as a broken table rather than an unsupported feature. Derive the admin product
type from the `/admin/products` path, not by reusing the catalog's `Product`.

Soft delete, verified end to end — deleting a product immediately:

- removes it from **every customer's cart**
- 404s on the public catalog **and on the admin's own detail endpoint**
- drops out of the admin list
- **cannot be undone through the API** — a later `PUT` answers `Product not found`

### The prompt

```
Read CLAUDE.md and docs/ROADMAP.md. Implement Phase 6 (Admin) only.

Follow the patterns in features/catalog and features/addresses. The /admin route and
AdminRoute guard already exist from Phase 1 — build inside them.

Read ../node-mongodb-ecommerce-project/src/modules/products/ for real behaviour. Four
things differ from the storefront and must not be assumed:
  - the admin list sorts by title only; sortBy=price is accepted and silently ignored, so
    do not offer a price sort
  - admin search matches description as well as title
  - the admin list returns the raw document including userId and isDeleted, so derive its
    type from the /admin/products path rather than reusing the catalog Product type
  - an admin only ever sees products they created

Deleting is a soft delete that cascades: the product vanishes from the public catalog, from
this admin's own list, and from every customer's cart. It cannot be undone through the API.

Phase 6 is done when all of these are true, and I want you to verify each one yourself in a
browser against the running backend before you tell me it's done:

  1. /admin is reachable as admin@shop.dev and refused to customer@shop.dev.
  2. The product table paginates, searches, and sorts against the server — and offers only
     the sorts the server actually honours.
  3. One form handles both create and edit, sharing a single Zod schema that mirrors the
     backend's rules.
  4. The image URL field previews the image, and shows a fallback rather than a broken
     image icon when the URL does not resolve.
  5. Deleting asks for confirmation and says plainly that it cannot be undone.
  6. After a delete, the product is gone from the admin table AND from the storefront
     catalog, with no reload.
  7. Creating a product makes it appear on the storefront catalog, with no reload.
  8. The empty state explains that admins only see products they created, so a new admin
     account does not look like a broken page.
  9. Editing a product updates what the storefront shows.
 10. Stock and price accept only non-negative numbers, matching the backend.

Don't start Phase 7.
```

### Checking Phase 6

Items 1–10. The three worth forcing:

- **Cross-surface invalidation (6/7/9).** Every admin mutation has to invalidate the *public*
  product queries too, not just the admin ones. Open the storefront in a second tab and watch it.
- **The ignored sort (2).** If a Price column header is clickable, click it and check the order
  actually changes. It will not.
- **Cart cascade (6).** Put a product in a customer's cart in one browser, delete it as admin in
  another, then reload the cart. The line should be gone, not a broken row.

---

## Audit (reusable — run after any phase)

Not tied to a particular phase. Run it whenever you want the current state checked: after a phase
lands, before a risky one, or any time the codebase feels like it has drifted.

Run it in a **fresh session**, not the one that wrote the code. A session reviewing its own work
shares its own blind spots, and it tends to explain rather than question.

Fill in the two bracketed lines and paste:

```
You are auditing this codebase, not extending it. Do not write application code, do not
fix anything yet, and do not start any new phase.

Read CLAUDE.md, docs/ROADMAP.md, then everything under src/.

  Completed so far: [e.g. Phases 0-2 — foundation, auth, catalog]
  Focus this audit on: [e.g. everything, or just features/catalog]

The backend runs on http://localhost:3000 and is a read-only dependency at
../node-mongodb-ecommerce-project — read it to check real behaviour.

Audit these six dimensions. For each, actively hunt for defects; do not summarise what the
code does well. Assume something is wrong and go find it.

  1. API INTEGRATION — Does every call match the backend's real contract? Check request
     shapes, query params, and response handling against the actual route handlers and Zod
     schemas, not against assumptions. Are the quirks in CLAUDE.md all genuinely handled?
     Anywhere the envelope, pagination shape, or error shape is assumed rather than typed?

  2. REACT CORRECTNESS — Stale closures, missing or wrong effect dependencies, state that
     should be derived but is stored, effects that should be event handlers, keys that are
     array indices, race conditions between a request and an unmount, anything that breaks
     under StrictMode double-invocation.

  3. SERVER/CLIENT STATE BOUNDARY — Any server data living outside TanStack Query. Any
     query key built inline instead of from the factory. Cache invalidation that is missing,
     too broad, or too narrow. staleTime values that will show stale prices or stock.

  4. SECURITY — Token handling and where it can leak. What happens to untrusted strings from
     the API: product titles, descriptions, imageURL, review comments, author names. URL
     parameters used without validation. Open redirects. Anything that would break if a
     product's imageURL were `javascript:alert(1)` or its description were 50KB of text.

  5. UX AND DESIGN — Walk the real screens at 360px, 768px, and 1440px. Loading, empty,
     and error states for every async surface. Focus order and visible focus. Labels on
     every control. Colour contrast. What happens on a slow network, and on a failed
     request. Anything that loses the user's work — including navigation that silently
     drops state the user built up.

  6. CODE QUALITY — Duplication that should be shared, abstractions that earn nothing,
     dead code, inconsistent conventions between features, comments that no longer match
     the code, `any` or unsafe casts hiding a real type problem.

For every finding, verify it is real before you report it — trace the actual code path or
reproduce it against the running API. A finding you cannot demonstrate is a guess; drop it
or label it clearly as unverified.

Report as a single table ordered by severity: severity (high/medium/low), dimension,
file:line, what is wrong, and what breaks as a result. Be specific about consequences —
"this is not ideal" is not a finding. End with the three you would fix first and why.

Then stop and wait. I will decide what gets fixed.
```

### After the audit

Expect false positives — press on anything the report cannot demonstrate. When you have agreed a
fix list:

```
Fix findings 1, 3, and 7 from the audit. Nothing else — no drive-by refactors.
After each fix, state which finding it closes and how you verified it.
Then re-run tsc, lint, and the build. Don't start the next phase.
```

---

## Phase 7 — Hardening

The last phase, and the only one whose output is confidence rather than features. Two hazards
shape it, both of which will waste an afternoon if discovered late.

**Playwright will trip the auth rate limiter.** The backend allows 50 sign-ins per 15 minutes
(dev) and 10 in production. A suite that signs in per test dies partway through with a 429 that
looks like a broken app. Sign in once in `globalSetup`, save `storageState`, and reuse it.

**Playwright mutates real data.** Checkout decrements stock and empties the cart for real — there
is no test database. Re-seed in `globalSetup` (`npm run seed` in the backend), and keep the
checkout spec serial: parallel workers racing for the last units of a product will fail each other
in ways that look like flakes but are the app working correctly.

**Current bundle**, as the baseline to improve on:

| Chunk | Raw | Gzip |
| --- | --- | --- |
| `index` (React, Router, Query, Radix) | 431 kB | 139 kB |
| `schemas` (Zod + React Hook Form) | 107 kB | 32 kB |
| every route chunk | < 15 kB | < 5 kB |

Route splitting is already good — admin is its own 9 kB chunk. The `schemas` chunk loads on any
route with a form, and is the most obvious thing left to attack.

### The prompt

```
Read CLAUDE.md and docs/ROADMAP.md. Implement Phase 7 (Hardening) only. No new features.

Two things will bite if you do not plan for them:
  - The backend allows 50 sign-ins per 15 minutes. Playwright must sign in once in
    globalSetup, save storageState, and reuse it — not sign in per test.
  - There is no test database. Checkout really decrements stock and empties the cart, so
    globalSetup should re-seed the backend (npm run seed in ../node-mongodb-ecommerce-project)
    and the checkout spec must run serially.

Phase 7 is done when all of these are true, and I want you to verify each one yourself
before you tell me it's done:

  1. MSW handlers reproduce the real envelope, including BOTH error shapes — the joined
     "field: msg; field: msg" string and the Mongoose object keyed by field — so the
     ApiError parser is actually covered.
  2. Vitest + RTL cover, at minimum: cart totals and item counts, the optimistic quantity
     rollback (including that a failed mutation does not rewind a concurrent successful
     edit), the auth guards, and the redirect-back-after-signin path.
  3. One Playwright run goes signin -> browse -> add to cart -> checkout -> review, green
     twice in a row from a re-seeded backend.
  4. The React Compiler is enabled. Report every Rules-of-React violation it finds rather
     than suppressing them — those are real defects. Remove memoization it makes redundant.
  5. Every interactive element is reachable by keyboard with a visible focus state, and
     cart quantity changes are announced to screen readers.
  6. npm run build stays under the current 139 kB gzip for the main chunk, and you tell me
     what you changed if it moves either way.
  7. tsc, lint, format, and the full test suite all pass from a clean checkout.

Report what you could not achieve rather than lowering a target quietly.
```

### Before deploying

Not Claude's job — yours, and easy to forget:

- Reset the backend's dev rate limits to the code defaults: `RATE_LIMIT_MAX_REQUESTS=100`,
  `AUTH_RATE_LIMIT_MAX_REQUESTS=10`.
- Add the deployed frontend origin to the backend's `ALLOWED_ORIGINS`.
- Set `VITE_API_URL` to the real API origin for the production build — the Vite proxy is
  dev-only.
- The backend's `JWT_SECRET` in `.env` is a dev value. Generate a fresh one for production.

### After Phase 7

Run the reusable audit one final time as a ship gate. It is worth more now than before: findings
can be encoded as failing tests before they are fixed.

Then `docs/ROADMAP.md` has a "Beyond v1" section — order lifecycle is the highest value per hour,
and the only item there that needs no backend guesswork.
