# Luinsomniac Art

[![Made with AI](https://img.shields.io/badge/Made_with-AI_assistance-blue)](AI-USAGE.md)

> Built with heavy help from **Claude Code** (Anthropic): I designed the site, made
> the product and database decisions and tested everything, and Claude typed most
> of the code. The full record, including where it got things wrong and which code
> is mine, is in [AI-USAGE.md](AI-USAGE.md).

A portfolio website where Luis Frigillana's 3D and 2D multimedia work is browsable in one place.

**Live site:** (link)
**API:** (link)
**Demo video / presentation:** [Google Drive folder](https://drive.google.com/drive/folders/1SVNQYluveNzJfu5370vtAFLdgJwEL08Q?usp=sharing)

> **This deployment is running in demo mode.** The interface is real; the backend
> is simulated in your browser so the site works without a server. See
> [Demo mode](#demo-mode) below. Delete this quote once your API is live.

## What it does
- **Home** — a hero with the artist's 3D profile character, highlighted demo reel, featured
  works, services offered, and a short About summary.
- **Museum** — every work in a masonry grid, filtered by category.
- **3D Showcase** — showcases all 3D works of the artists and their details.
- **About** — portrait, contact links, the longer bio, an experience timeline
  and the software list
- **Admin** (`/admin`) — a private dashboard for the artist and the developer:
  add, edit, publish, archive and permanently delete works (artworks, 3D models,
  videos), manage categories and uploaded media, and edit the site's text, links
  and brand assets. Sign-in is by invitation only; nobody can sign up.
- **Protected artwork** — every public artwork image is served through the API
  with a small corner watermark, and the right-click "Save image" menu hands out
  a copy with a faint tiled mark. See [Image watermark](#image-watermark).

## Built with
React 18, Vite and Tailwind v4 on the front end (with `<model-viewer>` for `.glb`
models), Express, `sharp` and PostgreSQL on the back end. Client and API both run
on Vercel; the database, sign-in (Supabase Auth) and file bucket are Supabase.

## Demo mode
This repository runs two ways, chosen by one environment variable at **build**
time.

**Demo mode is the default.** Only the exact string `false` turns it off, so a
forgotten or mistyped variable leaves you on the simulated backend with a visible
notice rather than on a silently broken build.

| `VITE_USE_MOCK_API` | What happens |
| --- | --- |
| unset, or `true` | The client answers its own requests from `src/api/seed.json`. No server, no database. The whole portfolio renders with real artwork metadata, so the site is demonstrable even if a free tier is asleep. |
| `false` | The client calls the Express API, which reads Supabase PostgreSQL. The admin signs in through Supabase Auth. |

In demo mode the admin runs against a mock stored in your browser's
`localStorage`, so you can click through the whole dashboard without an account.

| Piece | Where it lives |
| --- | --- |
| **Client** | Vercel, built from `client/` |
| **API** | Vercel serverless functions, from `server/` |
| **Database** | Supabase PostgreSQL, free tier |
| **Images and models** | Supabase Storage (public bucket, `media` by default), or Google Drive links; both are served through the API |

## Running it yourself

**The client only, in demo mode.** No database needed.

    cd client
    npm install
    cp .env.example .env        # VITE_USE_MOCK_API stays true
    npm run dev                 # http://localhost:5173

**The whole stack.** Either point `DATABASE_URL` at your Supabase project, or run
PostgreSQL locally:

    # 1. the database
    docker run --name luinsomniac-pg -e POSTGRES_PASSWORD=devpassword \
      -e POSTGRES_DB=luinsomniac -p 5432:5432 -d postgres:17

    # 2. the API
    cd server
    npm install
    cp .env.example .env        # DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
    npm run db:reset            # creates the tables and adds the content
    npm run dev                 # http://localhost:3000

    # 3. the client, in another terminal
    cd client
    npm install
    cp .env.example .env
    # set VITE_USE_MOCK_API=false, plus VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
    npm run dev

`npm run db:reset` runs `schema.sql` and then `seed.sql`, so do not run it against
the Supabase project once that holds real content: it will add the seed rows again.

The server needs Node 20 or newer. To use `/admin` against a real backend you also
need a Supabase Auth user whose id is a row in the `admins` table; sign-ups are
switched off, so create the user in the Supabase dashboard.

Check the API on its own before you blame the client:

    curl http://localhost:3000/healthz     # is the process alive
    curl http://localhost:3000/readyz      # is the database reachable
    curl http://localhost:3000/api/works

## Environment variables
None of these are committed. `.env.example` in each folder lists them with
placeholder values.

| Name | Where | What it is |
| --- | --- | --- |
| `DATABASE_URL` | server | Supabase connection string, pooler on port 6543, `?sslmode=require`. Contains a password |
| `SUPABASE_URL` | server | the project URL, for verifying admin sign-ins and Storage uploads |
| `SUPABASE_SERVICE_ROLE_KEY` | server | full-access key for Storage writes and token checks. Never send this to the browser |
| `SUPABASE_BUCKET` | server | the public Storage bucket for uploads; `media` by default |
| `CORS_ORIGINS` | server | unused while client and API share an origin; still needed for local dev |
| `NODE_ENV` | server | `production` on Vercel |
| `PORT` | server | **set by the host**; unused on Vercel functions |
| `VITE_USE_MOCK_API` | client, at build time | only `false` turns demo mode off; unset means on |
| `VITE_API_BASE_URL` | client, at build time | empty — the API is same-origin. A full URL only if the two are split |
| `VITE_SUPABASE_URL` | client, at build time | the project URL, for admin sign-in. Public |
| `VITE_SUPABASE_ANON_KEY` | client, at build time | the anon key, for admin sign-in. Public by design |

Every `VITE_` value is compiled into the built JavaScript and is **public**. Never
put a key, a password or a connection string in one. Supabase hands you two keys:
the **anon** key is designed to be public, the **service_role** key bypasses row
level security entirely and belongs only in the API's environment.

## Deploying 
**Database, on Supabase.** Create a project, then run `server/db/schema.sql` once
in Database > SQL Editor. It is idempotent, so running it twice is safe. Take the
connection string from Project Settings > Database and use the **connection
pooling** one on port 6543, not the direct connection on 5432.

**Images, on Supabase Storage.** One public bucket. The API uploads with the
service-role key and stores the file's location in PostgreSQL; the database
never holds image bytes. Artwork can also point at Google Drive links. Either way
the public site only ever sees `/api/img/...` URLs (see below).

**Admin accounts, on Supabase Auth.** Turn sign-ups off, create each admin in the
dashboard, then add their user id to the `admins` table. A valid token alone is
not enough; the API also checks that allowlist.

**Client and API, on Vercel.** Import the repository, set the environment
variables above under Settings > Environment Variables, and push to `main` —
Vercel builds every push and gives each one a preview URL. Every `VITE_` variable
is read at **build** time, so changing one needs a redeploy, not just a save.

## Project structure
    client/                React front end, built by Vite
      src/api/             ONE interface, two implementations, chosen by a variable
        index.js           the switch; the only file components import from
        mock.js, real.js   browser-backed (demo) and fetch-backed (live)
        seed.js            the portfolio's content, for demo mode
      src/pages/           Home, Museum, Showcase3D, About
      src/admin/           the /admin dashboard, lazy-loaded with its own layout
        pages/             Dashboard, Works, WorkEditor, Media, Categories, SiteSettings
      src/components/      WorkCard, Lightbox, ArtworkSaveMenu, SectionHeader, ...
      src/styles.css       Tailwind v4 @theme: colours, fonts, spacing, radii
    server/                Express API
      app.js               middleware and route wiring
      server.js            local entry point
      routes/              public, images, and the admin routes (works, media, ...)
      auth.js              verifies the Supabase token, checks the admins allowlist
      watermark.js         the sharp pipeline behind /api/img
      db/                  pool.js, schema.sql, seed.sql, run.js
    api/index.js           Vercel serverless entry for the Express app
    docs/                  proposal, mockups, design system, weekly reports,
                           demo video, security and privacy

## Architecture
Three pieces on two hosts. The React client is a static bundle served by Vercel;
it holds no secrets and calls `/api/...` on its own origin, so there is no CORS in
production. Those paths are handled by the Express app running as a Vercel
serverless function, the only thing that touches the database: it validates input
server-side and runs parameterised queries against Supabase PostgreSQL through the
transaction pooler. Admin routes under `/api/admin` require a Supabase Auth token whose user is on the
`admins` allowlist. Images are uploaded to Supabase Storage with a service-role
key that never leaves the server, and PostgreSQL stores only their locations.
Public responses never include an original file's address.

### Image watermark
Artwork images are served by `/api/img/:mediaId?w=400|800|1200|2000`, resized and
stamped by `sharp`. The site shows a small corner mark; the custom "Save image"
menu (right-click, or long-press on Android) downloads `?download=1`, which adds a
faint diagonal tile. The mark is drawn into the pixels, so it can't be removed
with devtools. It won't stop a screenshot. Only images used by a published work
are served, and Vercel's CDN caches them for a week. Site assets (stickers,
portrait, logo), `.glb` models and YouTube embeds are not watermarked.

## What I would do next
- Move off `rejectUnauthorized: false` in `server/db/pool.js`. Supabase publishes
  a CA certificate; the connection is encrypted either way, but it is not
  verifying who answers.
- Resize Supabase-hosted uploads. Drive images get several sizes, but files in the
  Supabase bucket are served at the one size they were uploaded at; resizing them
  needs Supabase's paid image transforms or a resize step on upload.
- Add automated tests. The repository has none yet; the API was checked by hand.

## Author
Designed and developed for Luinsomniac | Built by [@JReshley](https://github.com/JReshley) | 2209 CS-402

## AI use
![Built with AI assistance](https://img.shields.io/badge/built%20with-AI%20assistance-0b5fff)

Built with Claude. The full account, including where it was wrong, is in
[AI-USAGE.md](AI-USAGE.md).

## Licence
MIT, see [LICENSE](LICENSE).
