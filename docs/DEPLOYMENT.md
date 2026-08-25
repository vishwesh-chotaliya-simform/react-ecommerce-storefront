# Deployment

Free tier throughout, no card required. Three services:

| Piece | Where | Repo |
| --- | --- | --- |
| Database | MongoDB Atlas M0 | — |
| API | Render (free web service) | `vishwesh-chotaliya-simform/node-mongodb-ecommerce-api` (private) |
| Frontend | Vercel | `vishwesh-chotaliya-simform/react-ecommerce-storefront` (public) |

Do it in this order. The API and the frontend each need the other's URL, so step 5 closes
the loop.

---

## 1. Database — MongoDB Atlas

Atlas M0 is free forever and needs no card. It matters that it is a **3-node replica set**:
checkout runs inside a transaction, which a standalone MongoDB rejects.

1. Sign up at <https://www.mongodb.com/cloud/atlas/register>.
2. Create a **M0 free** cluster. Pick the region closest to you.
3. **Database Access** → Add New Database User. Username and password, "Read and write to any
   database". Save the password — it goes in the connection string.
4. **Network Access** → Add IP Address → **Allow access from anywhere** (`0.0.0.0/0`).
   Render's free tier has no fixed outbound IP, so an allowlist cannot work.
5. **Connect** → Drivers → copy the connection string. It looks like:

   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

   **Insert the database name before the `?`** or everything lands in `test`:

   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/ecommerce?retryWrites=true&w=majority
   ```

> If the password contains `@ : / ? # [ ] %`, URL-encode it, or the string will not parse.

## 2. Seed the database

The cluster starts empty — no products, and no admin account (signup only ever creates
customers). Seed it from your machine, from the **backend** repo:

```bash
cd ../node-mongodb-ecommerce-api
MONGO_URI="mongodb+srv://…/ecommerce?retryWrites=true&w=majority" npm run seed
```

That writes 12 products, `admin@shop.dev` / `Admin@12345`, and
`customer@shop.dev` / `Cust@12345`. An inline `MONGO_URI` wins over `.env`, so your local
setup is untouched.

## 3. API — Render

1. Sign up at <https://render.com> with GitHub. No card.
2. **New → Blueprint**, pick `node-mongodb-ecommerce-api`. Grant access to the private repo
   when prompted. Render reads `render.yaml` and fills in the build and start commands, the
   health check, and every non-secret variable.
3. It will prompt for the three secrets:

   | Variable | Value |
   | --- | --- |
   | `MONGO_URI` | the Atlas string from step 1 |
   | `JWT_SECRET` | generate one: `openssl rand -hex 32` |
   | `ALLOWED_ORIGINS` | leave blank for now — filled in at step 5 |

4. Deploy, then confirm:

   ```bash
   curl https://YOUR-API.onrender.com/health-check
   # {"success":true,"message":"Service is healthy","data":null}
   ```

Note the URL. Interactive API docs are at `https://YOUR-API.onrender.com/api-docs/`.

## 4. Frontend — Vercel

1. Sign up at <https://vercel.com> with GitHub. No card.
2. **Add New → Project**, import `react-ecommerce-storefront`. `vercel.json` already sets the
   framework, build command, output directory, and the SPA rewrites, so accept the defaults.
3. Add one environment variable, for **all** environments:

   | Variable | Value |
   | --- | --- |
   | `VITE_API_URL` | `https://YOUR-API.onrender.com` — no trailing slash |

4. Deploy. Note the `https://YOUR-APP.vercel.app` URL.

> `VITE_*` values are compiled into the bundle at build time, not read at runtime. Changing
> this variable later requires a redeploy, not just a save.

## 5. Close the loop

Back in Render → your service → **Environment**:

```
ALLOWED_ORIGINS = https://YOUR-APP.vercel.app
```

No trailing slash — the check is an exact string match against the browser's `Origin` header.
Saving restarts the service.

Then open the Vercel URL and sign in as `customer@shop.dev` / `Cust@12345`.

---

## Things that will confuse you later

**The first request takes about a minute.** Render's free tier suspends a service after ~15
minutes of inactivity. The frontend shows a "Waking the server…" notice once a load passes
three seconds, so a visitor sees an explanation rather than a broken page. Everything after
that is fast until it idles again.

**Vercel preview deployments will fail CORS.** Every branch and pull request gets its own
`*.vercel.app` hostname, and none of them are in `ALLOWED_ORIGINS`. Either add the specific
preview URL when you need one, or just test on production.

**Atlas pauses an idle M0 after 60 days.** Resume it from the dashboard; no data is lost.

**Password reset cannot be completed in production.** The API stops returning the OTP once
`NODE_ENV=production`, because returning it lets anyone who knows an email address take over
that account. It is not logged either — that would just relocate a live credential into
somewhere exported, shipped, and screenshotted. So until a real email provider is wired in,
the hosted deployment has no way to finish a reset. If a demo account gets locked out, re-run
the seed (step 2); it recreates both accounts with their known passwords.

**Logs are ephemeral.** Winston writes files under `logs/`, which vanish on every deploy and
restart. Render's own log viewer is the real one.

## What is not deployed

Nothing here needs a paid tier, but a few things are simply absent from the backend and so
cannot appear in the deployment: payments, order status and tracking, product categories,
image upload, and an admin view of incoming orders. See "Beyond v1" in
[ROADMAP.md](./ROADMAP.md).

## Rotating a secret

`JWT_SECRET` only lives in Render. Change it there and every issued token stops validating,
which signs everyone out — that is the intended effect, and the correct response to a leak.
The local `.env` value is development-only and is not the deployed one.
