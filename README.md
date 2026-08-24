# React E-commerce Storefront

React 19 storefront + admin for the Express/MongoDB e-commerce API in
`../node-mongodb-ecommerce-project`.

> **Phase 0 complete.** The app scaffold, typed API client, and a live product grid are in
> place. Phase 1 (auth) is next — see `docs/ROADMAP.md`.

## Prerequisites

The API must be running. In a separate terminal:

```bash
cd ../node-mongodb-ecommerce-project
npm run db:start    # replica set on :27018 — required for checkout
npm run dev         # http://localhost:3000
```

Seeded logins: `admin@shop.dev` / `Admin@12345`, `customer@shop.dev` / `Cust@12345`.

## Running

```bash
npm install
npm run dev         # http://localhost:5173
```

Vite proxies `/api/*` to the API and strips the prefix — the backend serves `/products`, not
`/api/products`. Set `DEV_API_PROXY_TARGET` if the API is not on port 3000.

| Script | What |
| --- | --- |
| `npm run dev` | Dev server on :5173 |
| `npm run build` | Typecheck, then production build to `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint, type-aware |
| `npm run format` | Prettier write |
| `npm run gen:api` | Regenerate `src/lib/api-types.d.ts` from `docs/openapi.json` |

## What's here

| Path | What |
| --- | --- |
| `CLAUDE.md` | API contracts, backend quirks, stack decisions, conventions |
| `docs/ROADMAP.md` | The eight build phases |
| `docs/PROMPTS.md` | Per-phase session prompts and acceptance checks |
| `docs/PROJECT-WRITEUP.md` | How the project was built, and the React concepts it covers |
| `docs/openapi.json` | Spec extracted from the backend's `openApiDocument` |
| `src/lib/api-client.ts` | Bearer token, envelope unwrapping, `ApiError`, global 401 |
| `src/lib/api-types.d.ts` | Generated request/response types — do not hand-edit |
| `src/features/` | One folder per feature; a feature owns its queries |
| `src/routes/` | Route tree, lazy boundaries, error boundaries |

## Regenerating API types

See the "Generated API types" section of `CLAUDE.md`. Short version: re-extract
`docs/openapi.json` from the backend, then `npm run gen:api`.
