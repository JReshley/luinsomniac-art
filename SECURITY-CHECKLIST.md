# Security checklist

Filled in on 2026-10-08, before the repository goes public for marking. Every
answer below comes from something I ran or read in this repository on that day.

## Secrets and credentials

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 1 | `.env` is gitignored and is not in the repository | Yes | `.gitignore` lines 2-5 ignore `.env`, `.env.*` and `server/.env`. `git ls-files` lists only the three `.env.example` files. |
| 2 | A `.env.example` with placeholder values only is committed | Yes | `.env.example`, `server/.env.example` and `client/.env.example` are committed. Values are placeholders like `your-project-ref`, `your-password`, or empty (`SUPABASE_SERVICE_ROLE_KEY=`). |
| 3 | No connection string, key or password is hardcoded in source, comments or commented-out code | Yes | `git grep` for `eyJ…` JWTs, `sk_live`, `AKIA…` and `postgres://user:pass@` finds only placeholders in the `.env.example` files. `compose.yml` reads `${POSTGRES_PASSWORD}` from the environment. |
| 4 | Git history is clean: I searched `git log -p` for password, secret, api key and `postgres://` | Yes | Searched every added line in `git log --all -p` for password/secret/api key/token assignments and `postgres://user:pass@`. Only hits were placeholders, a form-validation line in the login screen, and a comment example. No `.env`, `.pem` or `.key` file was ever added. |
| 5 | Any credential that was ever committed has been rotated | N/A | No credential was ever committed (row 4), so there is nothing to rotate. |
| 6 | Production credentials live only in my hosting provider's environment settings | Yes | Checked in the Vercel dashboard: all are set there. `vercel.json` has no env values. `docs/07-supabase-setup.md` tells me to set `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and the rest in Vercel's Environment Variables. The service role key is only ever read in `server/supabase.js`. |

## GitHub Actions

One workflow: `.github/workflows/deploy-pages.yml`, which builds the client for GitHub Pages.

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 7 | No secret value is written literally in any workflow YAML file | Yes | The only values are `${{ vars.* }}` and `${{ github.* }}` expressions. |
| 8 | Secrets are stored in repository Actions secrets and read with `${{ secrets.NAME }}` | N/A | The workflow uses no secrets on purpose. Its four `VITE_*` values are public (they end up in the built JavaScript), so they are repository *variables*. The real secrets live on Vercel, not in Actions. |
| 9 | No workflow step echoes, dumps or debug-prints a secret, and I opened a recent run's log to confirm | Yes | Opened the latest run's log with `gh run view --log-failed`. The only secret-like value, the OIDC token, shows as `***`. No step echoes anything but `ready=` and a notice. |
| 10 | Uploaded build artifacts contain no `.env`, key file or generated config | Yes | Only `client/dist` is uploaded. Vite does not copy `.env` into it, and the only config baked in is the public `VITE_` set. |
| 11 | Third-party actions are pinned to a commit SHA, not a moveable tag | Yes | **Fixed today.** They were `@v4` / `@v3` tags. All four `uses:` lines now carry a full commit SHA with the tag in a comment. |
| 12 | Secret scanning and push protection are enabled on the repository | Yes | `gh api repos/JReshley/luinsomniac-art` reports `secret_scanning: enabled` and `secret_scanning_push_protection: enabled`. (Dependabot security updates are still disabled.) |

## Database

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 13 | Every query taking user input uses parameters, never string concatenation | Yes | Every `pool.query` / `client.query` in `server/routes` passes values as `$1…`. The one place SQL text is built, `updateRow` / `insertRow` in `server/rows.js`, interpolates only column names taken from a hardcoded `columns` whitelist; values still go in the parameter array. |
| 14 | The database is not open to the whole internet, or is reachable only by the app | No | Supabase's session pooler accepts connections from anywhere. It is protected by a long password and TLS, not by a network allowlist. I accepted this because Vercel functions have no fixed IP to allow. |
| 15 | The database user the app connects as has only the permissions it needs | Yes | **Fixed today.** The app now connects as `portfolio_app`, a role with only SELECT, INSERT, UPDATE and DELETE on the `public` tables. It cannot alter or drop tables or create roles. It has `BYPASSRLS` because the tables use RLS with no policies. Tested locally: `/readyz` is up, `/api/works` returns the works, and an admin edit saves. `DATABASE_URL` in Vercel now uses this role. The owner `postgres` URL is kept only for `db:schema` / `db:seed` on my machine. |
| 16 | Seed and sample data is invented, not real people's data | Yes | `server/db/seed.sql` holds sample works and the artist's own public bio, social links and contact email, which are on the site on purpose. No classmates or clients. |
| 17 | Debug, seed and reset routes are removed before going public | Yes | The routes in `server/routes` are works, media, categories, content, dashboard, images and public. There is no seed, reset or debug route. `db:seed` and `db:reset` are npm scripts run by hand, not HTTP endpoints. |

## Access control

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 18 | The app has an access layer: Cloudflare Zero Trust, an app-level password, or a real login | Yes | Supabase Auth sign-in, plus an `admins` table allowlist checked in `server/auth.js`. Sign-ups are off in Supabase. |
| 19 | If Supabase or Firebase: Row Level Security or security rules are on, and I tested it signed out | Yes | `schema.sql` enables RLS on all 12 tables with no policies. Tested signed out with the public anon key: `GET /rest/v1/works`, `admins` and `media` each returned 401 `permission denied`, and a `POST` to `site_text` returned 401. |
| 20 | If Zero Trust: tjakoen.s@gmail.com is on the access policy. If an app password: the credentials are in my private workspace `project/README.md` | N/A | I use neither Zero Trust nor a shared app password. The gate is a real Supabase login, and the admin account is not shared. |
| 21 | The gate covers every route, including the ones that only change data | Yes | In `server/app.js` every write route hangs off one `admin` router that has `requireAdmin` applied first. The public routers (`/api`, `/api/img`) contain only `GET` handlers. |
| 22 | The credentials for the gate are environment variables, not in source | Yes | The Supabase URL and keys are read from `process.env` (server) and `import.meta.env` (client). The client only gets the public anon key. |

## Input and output

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 23 | Input from the user is validated on the server, not only in the browser | Yes | `server/workRules.js` trims and length-checks text (title 200, captions 200, details 80), `routes/content.js` requires social links to match `^https://`, and `media.js` enforces a 50 MB cap and an image-type allowlist. Body size is capped at 100 kb. The schema's `CHECK`s and triggers refuse bad rows too. |
| 24 | User-supplied text is escaped when rendered, so it cannot inject markup or script | Yes | The client is React and has no `dangerouslySetInnerHTML` or `innerHTML` anywhere in `client/src`. Links are forced to `https://`, so no `javascript:` URLs. |
| 25 | Error responses do not expose stack traces, file paths or connection details | Yes | `server/errors.js` logs the real error and returns a fixed "Something went wrong" 500. Known Postgres errors are mapped to short messages. `/readyz` returns only `db: down`. |
| 26 | CORS is not a wildcard on routes that change data | Yes | `cors({ origin: allowedOrigins })` in `server/app.js`, with origins from `CORS_ORIGINS`. The default is `http://localhost:5173`. |

## Repository and privacy

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 27 | No student number, personal email, phone number or home address in the repository or in commit messages | No | The files are clean: the only address is the artist's public contact email, put on the site on purpose. But **53 of 54 commits have my personal Gmail as the author email**, and that is public on GitHub. Commit messages themselves are clean. Fixed going forward: this repo's `user.email` is now my GitHub no-reply address. The 53 old commits are not rewritten, so the Gmail is still visible in them. **Accepted on purpose:** this is the address I use for my own accounts, it is not a secret or a login credential, and it is not tied to anyone else. Rewriting history would force-push a public repository and change every commit hash for no real gain. The risk I accept is spam or scraping of that address. |
| 28 | No classmate's personal data in the repository | Yes | `git grep` finds no names, numbers or emails of classmates. The seed contains only the artist's own details. |
| 29 | Dependencies come from official registries, and `node_modules` is gitignored | Yes | `.gitignore` has `node_modules/`. `npm audit --omit=dev` reports 0 vulnerabilities in both `client` and `server`. |
| 30 | Images, fonts and other assets are mine, licensed, or credited | Yes | Stickers, the Lucas art and the artwork are the artist's own, shown with his consent. Fonts (Outfit, IBM Plex Mono, Slackey) are open-licensed Google Fonts. Code is MIT, per `LICENSE`. |
| 31 | Repository visibility is deliberate, and I checked it after my last push | Yes | `gh repo view` reports `PUBLIC` for `JReshley/luinsomniac-art`. Public is deliberate, since the site has to be marked. |

## Anything I found and fixed

Going through it caught three things I did not know about. The four GitHub Actions
were pinned to moveable tags, so I replaced them with commit SHAs (row 11). My
personal Gmail is the author email on 53 commits (row 27), and the database user
was the default `postgres` role (row 15). I replaced it with a limited role, `portfolio_app`. For the email,
I set this repo's `user.email` to my GitHub no-reply address, so new
commits are clean. The old commits still show the Gmail, and I chose not to rewrite
history (see row 27 for why). Everything else I could check
passed, including the signed-out RLS test.
