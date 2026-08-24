# Building a React storefront on an existing Node API

I took an inherited Express/MongoDB e-commerce backend that would not run, got it working, and
built a complete React 19 storefront and admin against it — using Claude Code as a pair, one
reviewed phase at a time.

| | |
| --- | --- |
| Phases | 8 / 8 |
| Source | ~8.7k lines |
| Features | 8 modules |
| Tests | 34 passing (29 unit + 5 e2e) |
| Main bundle | 110 kB gzip |
| Vulnerabilities | 0 |

## Where it started

A colleague's learning project, cloned onto my machine: a Node/Express/MongoDB e-commerce API
with six modules — users, addresses, cart, orders, products, reviews. No `.env`, no README, no
seed data, and no frontend. It did not start.

The goal was mine, not the repo's: I am a backend developer, and I wanted to learn modern React
properly. A real API with real constraints is a far better teacher than a tutorial, because the
awkward parts are genuine.

## How it was done

### 1. Made the backend run

Wrote the `.env`, installed, and hit a real blocker: checkout wraps stock decrement, order
creation, and cart clearing in a MongoDB transaction, and transactions require a replica set. The
machine's MongoDB was a standalone, so every checkout would have failed. Brought up a single-node
replica set on a separate port as a user process, leaving the system service untouched, and added
scripts so it is one command to start.

_Added: `dev-mongo.sh`, `seed.ts` (12 products, 2 accounts), README, npm scripts._

### 2. Turned the API into a typed contract

The backend already described itself with Zod schemas and an OpenAPI document, but only served it
as HTML. Rather than modify a colleague's repo, the document object was extracted directly and fed
to `openapi-typescript`. That produced 2,434 lines of request and response types generated from
the backend's own validation rules — so the two halves of the stack cannot drift apart silently.

_Result: 2,434 lines of generated types, zero hand-written API interfaces._

### 3. Wrote down what the API actually does

Probing every endpoint surfaced roughly a dozen behaviours no one would guess: adding to the cart
_increments_ rather than sets, several endpoints answer with no body, a price filter is rejected
unless both bounds are sent, reviews are gated on having actually bought the item, and admin search
behaves differently from shopper search. These went into a project brief that every later session
started from.

_Added: `CLAUDE.md` — contracts, quirks, conventions, stack decisions._

### 4. Built it in eight reviewed phases

Foundation, auth, catalog, cart, checkout, orders and reviews, admin, hardening. One session per
phase, in a separate repository, each ending in a numbered list of things I could go and click. Not
"implement pagination" but "copy the address bar into a new tab and the same results come back". A
phase was only done when I had walked that list myself.

_Result: 8 feature modules, 21 routes, ~8.7k lines._

### 5. Audited it independently, mid-build

After checkout, a fresh session with no memory of writing the code reviewed everything across six
dimensions — API integration, React correctness, state boundaries, security, UX, code quality. It
was told to hunt for defects rather than summarise, and to prove each finding against the running
API before reporting it.

_Result: 9 files changed, +211 / −146._

### 6. Hardened and measured

Unit tests against a mocked network layer, one end-to-end run through sign-in, cart, checkout and
review, the React Compiler enabled, and route-level code splitting. The end-to-end suite re-seeds
the database and runs serially, because checkout really does decrement stock — it passes twice in a
row, which is the test that catches a suite quietly depending on its own leftovers.

_Result: 29 unit + 5 e2e passing, main bundle 139 → 110 kB gzip._

## The most valuable thing that happened

**The independent audit caught a real bug that a normal review had already passed.** The cart's
optimistic updates rolled back by restoring a snapshot taken before the request. That looks
obviously correct, and I had signed it off. It is not: if you change one line's quantity while
another line's removal is still in flight and that removal fails, restoring the whole snapshot also
rewinds the edit that succeeded.

The fix gives each mutation a targeted undo that reverts only its own change. The lesson
generalises well beyond this project: a reviewer who wrote the code shares its blind spots, and
concurrency bugs are exactly the class that reads as correct on a careful first pass.

## React concepts covered

The point of the exercise. Each of these was driven by a real requirement in the app rather than
added to tick a box.

**Data and state**

- Server state vs client state as a hard boundary
- TanStack Query caching, dedupe, invalidation
- Cross-feature invalidation (an order changes stock)
- Optimistic updates with correct rollback
- Zustand for session only

**Routing and URL**

- URL as the single source of truth for filters
- Shareable, bookmarkable filtered views
- Route guards and role-based access
- Redirect-back-after-login
- Lazy routes and code splitting

**React 19**

- `useOptimistic`, `useTransition`
- React Compiler, and dropping manual memoisation
- Suspense and per-route error boundaries
- Why Server Components do not apply to a REST SPA

**Forms and types**

- React Hook Form with Zod, mirroring server rules
- Mapping server errors onto the right input
- Types generated from the API, never hand-written
- Strict TypeScript, no escape hatches

**Quality**

- Vitest and Testing Library
- MSW — mocking at the network boundary
- Playwright against the real API
- Bundle analysis and splitting

**UI and accessibility**

- Tailwind v4, CSS-first configuration
- shadcn/ui on Radix primitives
- Keyboard navigation and focus management
- Live regions for cart changes
- Loading, empty, and error states everywhere

## What it is and is not

| Working | Deliberately out of scope |
| --- | --- |
| Browse, search, filter, sort, paginate | Payments — no gateway on the backend |
| Sign-up, sign-in, password reset, sessions | Order tracking — the API has no status field |
| Cart with live stock limits | Category browse — no categories in the schema |
| Address book and transactional checkout | Image upload — the API stores a URL string |
| Order history and purchase-gated reviews | Admin order view — the API scopes orders to the buyer |
| Admin product management | Refresh tokens — single 7-day JWT by design |

Every exclusion is a backend limitation, not a shortcut. Each was identified up front so no time
went into screens the API could not feed. The clearest next step is an order status field on the
backend — around an hour of work that would unlock order tracking and fulfilment, the two most
substantial screens still missing.

## How Claude was used

As a fast pair, not an autopilot. The pattern that made it work:

- **A written brief the assistant reads every session** — API contracts, known quirks,
  conventions — so nothing is re-explained or re-guessed.
- **One phase per session**, each with acceptance criteria expressed as things I can observe in a
  browser, not tasks to tick off.
- **Independent review sessions** that did not write the code they were checking.
- **Verification against the running API** rather than against assumptions — every documented
  quirk in that brief was confirmed with a real request.

The reviewing discipline mattered more than the generation speed. Code arrives quickly either way;
what decides whether it is worth keeping is whether someone checked it against reality.

---

React 19 · TypeScript · Vite 7 · TanStack Query v5 · React Router v7 · Tailwind v4 · shadcn/ui ·
Zod 4 · Vitest · Playwright — against Express 5, Mongoose 9, MongoDB 7
