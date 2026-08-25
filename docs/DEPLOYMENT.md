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

## 3b. Email — Brevo

Password reset sends a real email. Without this configured, the endpoint returns 503 in
production, so this step is not optional if you want reset to work.

This uses Brevo's HTTP API, not SMTP. Brevo's SMTP relay only accepts logins from IPs it has
already seen, and Render has no fixed outbound IP to ever add to that allowlist — every
connection from a freshly started instance gets rejected as unrecognised. The HTTP API
authenticates with a key in a header instead, so the source IP is irrelevant.

Brevo's free tier allows 300 emails a day, needs no card and no domain:

1. Sign up at <https://www.brevo.com>.
2. Left sidebar → **SMTP & API** → **API Keys** tab → **Generate a new API key** → copy it.
3. **Senders & Domains** → **Add a Sender** → an email address you actually control → verify
   it via the confirmation email Brevo sends. Delivery is rejected otherwise.
4. Add these to your Render service's environment:

   | Variable | Value |
   | --- | --- |
   | `BREVO_API_KEY` | the key from step 2 |
   | `MAIL_FROM` | `E-commerce Demo <your-verified-sender@example.com>` — must match step 3 |

> Skipping this is fine if nobody needs password reset. Everything else works, and the two
> seeded accounts have known passwords.

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

**Password reset needs `BREVO_API_KEY`.** Without it, the endpoint returns 503 in
production — it will not fall back to handing the code to the caller, because that lets
anyone holding an address take the account. Step 3b sets it up. Note also that the endpoint
answers unknown addresses exactly as it answers known ones, so "no email arrived" is not a
diagnostic.

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
