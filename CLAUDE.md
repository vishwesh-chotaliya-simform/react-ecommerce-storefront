# React E-commerce Storefront

React 19 SPA (storefront + admin) for the Express/MongoDB e-commerce API that lives at
`../node-mongodb-ecommerce-project`. That backend is a **read-only dependency** — it is a clone of
someone else's project. Never edit or commit to it. If something is missing there, say so and
propose the change; do not apply it.

`docs/ROADMAP.md` is the build plan. Work one phase at a time.

## Running the backend

The API must be up before anything here works. From `../node-mongodb-ecommerce-project`:

```bash
npm run db:start   # single-node replica set on :27018 — REQUIRED, see below
npm run dev        # http://localhost:3000
npm run seed       # 12 products + demo accounts
```

Checkout runs inside a MongoDB transaction, which only works on a replica set. The machine's
system `mongod` on :27017 is a standalone and will fail with `IllegalOperation`. `npm run db:start`
brings up the correct instance on :27018. If orders 500, check `npm run db:status` says PRIMARY.

Seeded logins: `admin@shop.dev` / `Admin@12345` and `customer@shop.dev` / `Cust@12345`.

## API contracts

Base URL `http://localhost:3000` — **no `/api` prefix**. Vite proxies `/api` → `:3000` and strips
the prefix, so app code calls `/api/products`.

### Response envelope

Every response, success or failure:

```jsonc
{ "success": true,  "message": "Products fetched successfully", "data": { ... } }
{ "success": false, "message": "Product not found",             "data": null }
```

`api-client.ts` unwraps `data` and throws `ApiError` on failure. **No component or hook ever sees
the envelope.** If you find yourself writing `.data.data`, the client is being bypassed.

### Errors

`message` is usually a flat string. Zod rejections join all field errors into that one string:

```
"email: Invalid email address; password: Password must be at least 8 characters long"
```

Mongoose schema errors are the one exception and return an object keyed by field. The client
normalises both into `ApiError.fields`.

These messages are well written — surface them directly, never replace them with "Something went
wrong":

| Status | When                             | Message                                           |
| ------ | -------------------------------- | ------------------------------------------------- |
| 403    | Reviewing an unpurchased product | You can only review products you have purchased   |
| 409    | Second review on same product    | You have already reviewed this product            |
| 400    | Cart quantity over stock         | Requested quantity exceeds available stock        |
| 400    | Checkout, no address             | You have no saved addresses…                      |
| 400    | Checkout, empty cart             | Cart is empty. Add items before placing an order. |
| 400    | Stock gone mid-checkout          | Insufficient stock for "…", only N left.          |
| 400    | One price bound only             | minPrice and maxPrice must be provided together   |
| 401    | Token superseded                 | Token is no longer valid. Please sign in again    |

### Pagination

Nested beside the list, and the list key is named per resource (`products`, `orders`, `reviews`) —
not generically addressable, so type each endpoint rather than writing one clever generic.

```jsonc
{ "data": { "products": [...], "pagination": { "total": 12, "page": 1, "limit": 10, "totalPages": 2 } } }
```

`limit` is capped at 100 server-side.

### Auth

Bearer JWT in the `Authorization` header. CORS runs `credentials: false`, so cookies are not an
option — the browser holds the token.

Tokens last 7 days and carry a `tokenVersion` checked against the user document on every request.
Sign-out, password change, and password reset all increment it, instantly killing every token
already issued. **A 401 can therefore arrive on any request at any time.** Handle it once,
globally, in the client: clear the session, clear the query cache, redirect.

There is no refresh token. Don't build one — it needs backend work.

### Roles

`admin` and `customer`. `POST /users/signup` always creates a customer; admins only exist by
direct DB write (the seed script does this).

`/admin/products` requires the admin role **and** filters by `userId` — an admin sees only products
they created, not the whole catalog. A second admin account starts with an empty dashboard.

## Backend quirks that will bite

- **`POST /cart` adds to the existing quantity**, it does not set it. Returns `data: null`, so you
  must refetch to see the new state. Same for `PATCH /cart/:productId`.
- **No guest cart.** `/cart` is behind `authenticate`. Either gate "add to cart" behind sign-in or
  keep a local cart and replay it as individual POSTs after login.
- **`minPrice` and `maxPrice` must be sent together** or the request 400s. A one-sided slider
  breaks.
- **Catalog `search` matches title only.** The admin list also matches description, so the same
  query returns different results in the two views.
- **No `canReview` flag.** The server checks for a matching order and 403s if absent. Cross-
  reference `/orders` against `/users/me/reviews` client-side to decide whether to show the button,
  and still handle 403 and 409.
- **Order items are snapshots** of title/price/image at purchase time. An old order showing an old
  price is correct — do not "fix" it by joining to the live product.
- **`POST /orders` takes only `{ addressId }`** and orders the whole cart in a transaction. Two
  clicks means two orders — disable the button until the mutation settles.
- **`PUT /admin/products/:id`** uses a `.partial()` Zod schema so it does accept partial bodies,
  but send the full object anyway to match the verb.
- **No order status field**, no admin order list, no categories, no image upload (`imageURL` is a
  plain string), no payment step. Don't design screens that need them.
- **`POST /users/change-password` returns a NEW token** and bumps `tokenVersion`, killing the
  one you hold. Store the returned token or the user is signed out the instant they change their
  password. (No client for this endpoint yet — it belongs with account settings.)
- **`POST /users/forgot-password` returns the OTP in the response** — deliberate, no mailer wired
  up. The reset screen can display it in dev.

## Stack

| Layer        | Choice                                 |
| ------------ | -------------------------------------- |
| Build        | Vite 7                                 |
| Runtime      | React 19 + TypeScript                  |
| Server state | TanStack Query v5                      |
| Routing      | React Router v7 (declarative)          |
| Client state | Zustand — session + UI only            |
| Forms        | React Hook Form + Zod v4               |
| Styling      | Tailwind v4 (`@theme`, CSS-first)      |
| Components   | shadcn/ui                              |
| API types    | `openapi-typescript` (generated)       |
| Tests        | Vitest + RTL + MSW; Playwright for e2e |

**The rule that matters most: server state is not client state.** Products, cart, orders, and the
user profile belong in TanStack Query. Zustand holds the token and a couple of UI booleans. If you
are writing `setProducts` in a store, stop.

Do not add Next.js. This is a static SPA against an existing REST API; a meta-framework would put a
second Node server in front of the Express one and duplicate work the backend already does.

React 19 specifics: use `useOptimistic` for cart steppers, `useActionState` for form submit state,
`useTransition` for non-blocking filter changes. Server Components do not apply here — there is no
React server.

## Generated API types

`src/lib/api-types.d.ts` is generated from the backend's Zod schemas via its OpenAPI document.
**Never edit it by hand.**

The backend does not expose the spec as JSON (`swagger-ui-express` serves HTML on every subpath
under `/api-docs`). It was extracted by importing the `openApiDocument` export directly. To
regenerate after a backend change:

```bash
cd ../node-mongodb-ecommerce-project
cat > .dump-openapi.tmp.ts <<'EOF'
import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { openApiDocument } from './src/config/swagger.js';
writeFileSync(process.argv[2], JSON.stringify(openApiDocument, null, 2));
EOF
npx tsx .dump-openapi.tmp.ts ../react-ecommerce-storefront/docs/openapi.json
rm .dump-openapi.tmp.ts   # leave the backend repo clean

cd ../react-ecommerce-storefront
npm run gen:api
```

If the backend ever gains a `GET /api-docs.json` route, replace all of that with
`npx openapi-typescript http://localhost:3000/api-docs.json -o src/lib/api-types.d.ts`.

## Structure

Mirror the backend's feature-module layout — `modules/cart` there maps to `features/cart` here.

```
src/
├── lib/           api-client.ts, api-error.ts, query-client.ts, api-types.d.ts
├── features/      auth, catalog, cart, addresses, checkout, orders, reviews, admin
├── components/    ui (shadcn), layout
├── routes/        route tree + lazy boundaries
└── styles/        index.css with Tailwind @theme tokens
```

**A feature owns its queries.** Every hook touching `/cart` lives in `features/cart/api.ts`.
Components import hooks; they never import `api-client` directly. That boundary is what makes the
app testable with MSW.

## Conventions

- TypeScript strict. No `any` — use `unknown` and narrow.
- Named exports; default exports only for route components.
- Query keys come from a typed factory, never inline string arrays.
- Filter state lives in the URL (`useSearchParams`), so a filtered catalog link is shareable.
- Mirror backend Zod validation rules exactly in form schemas (password min 8, pincode `^\d{6}$`,
  review comment 10–1000 chars, rating integer 1–5).
- Run `npm run lint` and `npx tsc --noEmit` before declaring a phase done.
