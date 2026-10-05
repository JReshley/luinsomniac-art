# Luinsomniac Art

[![Made with AI](https://img.shields.io/badge/Made_with-AI_assistance-blue)](AI-USAGE.md)

> Built with heavy help from **Claude Code** (Anthropic): I designed the site, made
> the product and database decisions and tested everything, and Claude typed most
> of the code. The full record, including where it got things wrong and which code
> is mine, is in [AI-USAGE.md](AI-USAGE.md).

A portfolio website where Luis Frigillana's 3D and 2D multimedia work is browsable in one place.

**Live site:** (link)
**API:** (link)
**Demo video:** (link)

> **This deployment is running in demo mode.** The interface is real; the backend
> is simulated in your browser so the site works without a server. See
> [Demo mode](#demo-mode) below. Delete this quote once your API is live.

![The Home hero and featured works](docs/assets/screenshot.png)

## What it does
- **Home** — a hero with the artist's 3D profile character, highlighted demo reel, featured
  works, services offered, and a short About summary.
- **Museum** — every work in a masonry grid, filtered by category.
- **3D Showcase** — showcases all 3D works of the artists and their details.
- **About** — portrait, contact links, the longer bio, an experience timeline
  and the software list

## Built with
React and Vite on the front end, Express and PostgreSQL on the back end. Client and API both run on Vercel; the database is Supabase PostgreSQL.

## Demo mode
This repository runs two ways, chosen by one environment variable at **build**
time.

**Demo mode is the default.** Only the exact string `false` turns it off, so a
forgotten or mistyped variable leaves you on the simulated backend with a visible
notice rather than on a silently broken build.

| `VITE_USE_MOCK_API` | What happens |
| --- | --- |
| unset, or `true` | The client answers its own requests from `src/api/seed.json`. No server, no database. The whole portfolio renders with real artwork metadata, so the site is demonstrable even if a free tier is asleep. |
| `false` | The client calls the Express API, which reads Supabase PostgreSQL. |

| Piece | Where it lives |
| --- | --- |
| **Client** | Vercel, built from `client/` |
| **API** | Vercel serverless functions, from `server/` |
| **Database** | Supabase PostgreSQL, free tier |
| **Images** | Supabase Storage, public bucket <<TODO: bucket name>> |

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
    cp .env.example .env        # check DATABASE_URL
    npm run db:reset            # creates the tables and adds the content
    npm run dev                 # http://localhost:3000

    # 3. the client, in another terminal
    cd client
    npm install
    cp .env.example .env
    # set VITE_USE_MOCK_API=false
    npm run dev

`npm run db:reset` runs `schema.sql` and then `seed.sql`, so do not run it against
the Supabase project once that holds real content: it will add the seed rows again.

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
| `SUPABASE_URL` | server | the project URL, for Storage uploads |
| `SUPABASE_SERVICE_ROLE_KEY` | server | full-access key for Storage writes. Never send this to the browser |
| `CORS_ORIGINS` | server | unused while client and API share an origin; still needed for local dev |
| `NODE_ENV` | server | `production` on Vercel |
| `PORT` | server | **set by the host**; unused on Vercel functions |
| `VITE_USE_MOCK_API` | client, at build time | only `false` turns demo mode off; unset means on |
| `VITE_API_BASE_URL` | client, at build time | empty — the API is same-origin. A full URL only if the two are split |

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
service-role key and stores the returned public URL in PostgreSQL; the database
never holds image bytes.

**Client and API, on Vercel.** Import the repository, set the environment
variables above under Settings > Environment Variables, and push to `main` —
Vercel builds every push and gives each one a preview URL. Every `VITE_` variable
is read at **build** time, so changing one needs a redeploy, not just a save.

## Project structure
    client/                React front end, built by Vite
      src/api/             ONE interface, two implementations, chosen by a variable
        index.js           the switch; the only file components import from
        mockApi.js         seed-backed, for demo mode
        httpApi.js         fetch against the Express API
        seed.json          the portfolio's content, for demo mode
      src/pages/           Home, Museum, Showcase3D, About
      src/components/      WorkCard, SectionHeader, FilterBar, ...
      src/styles.css       Tailwind v4 @theme: colours, fonts, spacing, radii
    server/                Express API
      server.js            routes, validation, /healthz and /readyz
      repos/               one module per table, every query parameterised
      db/                  pool.js, schema.sql, seed.sql, run.js
    docs/                  proposal, mockup, design system, weekly reports,
                           demo video, security and privacy

## Architecture
Three pieces on two hosts. The React client is a static bundle served by Vercel;
it holds no secrets and calls `/api/...` on its own origin, so there is no CORS in
production. Those paths are handled by the Express app running as a Vercel
serverless function, the only thing that touches the database: it validates input
server-side and runs parameterised queries against Supabase PostgreSQL through the
transaction pooler. Images are uploaded to Supabase Storage with a service-role
key that never leaves the server, and PostgreSQL stores only their public URLs.

## What I would do next
- Bring back an admin interface. Adding a work currently means an API call by
  hand, which is fine for me and useless for the artist.
- Move off `rejectUnauthorized: false` in `server/db/pool.js`. Supabase publishes
  a CA certificate; the connection is encrypted either way, but it is not
  verifying who answers.
- Serve responsive image sizes. The Museum grid downloads full-resolution artwork
  to draw a thumbnail, which is the slowest thing on the site.

## Author
Designed and developed for Luinsomniac | Built by [@JReshley](https://github.com/JReshley) | 2209 CS-402

## AI use
![Built with AI assistance](https://img.shields.io/badge/built%20with-AI%20assistance-0b5fff)

Built with Claude. The full account, including where it was wrong, is in
[AI-USAGE.md](AI-USAGE.md).

## Licence
MIT, see [LICENSE](LICENSE).
