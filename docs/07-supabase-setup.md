# Setting up Supabase and the API

The admin runs on a mock in the browser until this is done. Nothing here
changes the public demo on GitHub Pages until `VITE_USE_MOCK_API` is set to
`false` there.

Keep the keys out of git. The `service_role` key and the database password go
only in `server/.env` and the API host's dashboard.

## 1. Create the project

1. Create a Supabase project (free plan is enough). Choose the region nearest
   the API host, and save the database password somewhere private.
2. **SQL editor:** run `server/db/schema.sql`, then `server/db/seed.sql`.
   (Or `npm run db:reset` in `server/` with `DATABASE_URL` set.)
3. **Storage → New bucket:** name `media`, **Public bucket** on. Uploaded images
   and `.glb` files live here. Paths contain a random id.
4. **Authentication → Sign In / Providers → Email:** turn **off** "Allow new
   users to sign up". Leave "Confirm email" as you like.
5. **Authentication → URL Configuration:** set **Site URL** to the deployed site,
   and add both of these to **Redirect URLs** (password-reset emails need them):
   - `http://localhost:5173/admin/reset-password`
   - `https://<you>.github.io/<repo>/admin/reset-password`

## 2. Add the two admins

1. **Authentication → Users → Add user → Create new user** for each of John and
   Lui, with "Auto Confirm User" on. Choose a strong password for each.
2. Copy each user's **UID**, then in the SQL editor:

   ```sql
   INSERT INTO admins (user_id, display_name) VALUES
     ('<john-uid>', 'John'),
     ('<lui-uid>',  'Lui');
   ```

Being able to sign in is not enough: the API only lets in users who are in this
table.

## 3. Run the API locally

```bash
cd server
cp .env.example .env     # fill in DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev
```

Check http://localhost:3000/readyz says `{"ok":true,"db":"up"}`, and
http://localhost:3000/api/works lists the seeded works.

## 4. Point the client at it

In `client/.env`:

```
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=http://localhost:3000
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Restart `npm run dev`, open http://localhost:5173/admin and sign in.

## 5. Deploy on Vercel (site and API in one project)

`vercel.json` at the repo root builds the client and runs the Express app as a
Vercel function (`api/index.js`), so the site and its API share one address and
there is no CORS to configure.

1. **Vercel → your project → Settings → General → Root Directory:** clear it
   (the repo root, not `client`). Leave Framework Preset as Other; the build
   settings come from `vercel.json`.
2. **Settings → Environment Variables** (Production, and Preview if you use it):

   | Name | Value |
   |---|---|
   | `VITE_USE_MOCK_API` | `false` |
   | `VITE_API_BASE_URL` | leave unset: the API is on the same address |
   | `VITE_SUPABASE_URL` | the project URL |
   | `VITE_SUPABASE_ANON_KEY` | the anon / publishable key (never the secret one) |
   | `DATABASE_URL` | the **Transaction pooler** string (port 6543), with the password filled in |
   | `DB_POOL_MAX` | `1` |
   | `SUPABASE_URL` | the project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | the service_role / secret key |
   | `SUPABASE_BUCKET` | `media` |

   Don't add `NODE_ENV`: Vercel sets it, and setting it yourself makes the
   install skip Vite, so the build fails with "exited with 127".

   `VITE_*` values are baked into the public site; the others stay on the
   server. Only the anon key goes in a `VITE_` variable.
3. **Supabase → Authentication → URL Configuration:** Site URL
   `https://<your-site>.vercel.app`, and add
   `https://<your-site>.vercel.app/admin/reset-password` to Redirect URLs.
4. **Redeploy** (Deployments → ⋯ → Redeploy). Variables only apply to new
   builds.
5. Check `https://<your-site>.vercel.app/readyz` says `{"ok":true,"db":"up"}`,
   then sign in at `/admin/login`.

Serverless runs many short-lived copies of the API, so use the transaction
pooler and a pool of 1 each, or the database runs out of connections.

Prefer a separate API host (Render and similar)? Run `server/` with `npm start`,
give it the `server/.env` variables plus `CORS_ORIGINS=<the site's origin>`, and
set `VITE_API_BASE_URL` to its address.

## If something doesn't work

- **"Sign in isn't set up"** — the two `VITE_SUPABASE_*` values are missing.
- **Signs in, then "doesn't match an admin account"** — the user isn't in the
  `admins` table, or the UID was copied wrong.
- **Requests fail with a CORS error** — only with a separate API host: the
  site's origin isn't in `CORS_ORIGINS` there (no trailing slash).
- **`/api/...` returns the site's home page or a 404 on Vercel** — Root
  Directory is still `client`, so the root `vercel.json` and `api/` are ignored.
- **Build fails with "exited with 127"** — a `NODE_ENV=production` variable is
  set in Vercel. Delete it.
- **Uploads fail** — the bucket isn't named `media`, or `SUPABASE_BUCKET` is set
  to something else.
- **Password-reset link goes to the wrong page** — the redirect URL isn't in
  Supabase's list (step 1.5).
