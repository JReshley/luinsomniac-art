# Security and privacy checklist

Work through this **before your first push**, and again before you submit. It is
short, none of it is exotic, and a grader can check most of it in two minutes.

Your repository is public, in your own account, and permanent. That is the point
of it, and it is also why this file exists.

## Before the first push

- [x] `.gitignore` includes `.env`, and `git check-ignore -v .env` confirms it
- [x] `git ls-files | grep -iE '\.env$|\.pem$|id_rsa'` prints nothing
- [x] `.env.example` is committed, with **placeholder** values only
- [x] No connection string, key or password anywhere in the repository,
      including in a screenshot
- [x] No `student.json`, and no name, student number or email of yours or anyone
      else's. The only address is the artist's own public contact email, put on
      the site on purpose

Deleting a file later does **not** remove it from the history. If you commit a
credential, **rotate it first**, at the service, and clean up the history second.
The rotation is the fix; the cleanup is hygiene.

## The application

- [x] Every SQL query is parameterised. Values go in the array, never into the
      string. This is one line of defence you already know how to do
- [x] Input is validated **on the server**, not only in React. Length limits on
      every text field
- [x] `cors({ origin: allowedOrigins })` names your origins. Not `cors()` with no
      options, which allows every site on the internet
- [x] `NODE_ENV=production` on the host, and no stack trace in any response body
- [x] `helmet` installed, which is one line for several real protections
- [x] Anything that costs money or accepts a password is rate limited (n/a: the
      app has no paid service, and passwords are handled by Supabase Auth, which
      rate limits sign-in itself; see the journal note)
- [x] Passwords, if you have accounts, are hashed with bcrypt and never logged
- [x] Every route that touches somebody's data has the ownership check **in the
      query**, as `AND user_id = $2`, not as an `if` above it
- [x] `npm audit` run once, and the easy fixes taken

```bash
npm install helmet
```

```js
import helmet from 'helmet'
app.use(helmet())
```

## Privacy

The half that matters more, because it is about other people.

- [x] **No real classmates' names, numbers, emails or photos**, anywhere. Not in
      seed data, not in screenshots, not in the demo video. Consent for a course
      project does not cover the next ten years of a public repository
- [x] Seed data is invented. Yours will be read
- [x] If real people tested your app, even three friends, their data is deleted
      before you submit
- [x] If your app collects anything about anyone, the app says what it collects
- [x] Any face in a screenshot is stock, generated, or yours

If your project handles personal information about real people, you are inside
the Philippine Data Privacy Act. Collect the minimum, say what you collect, and
do not collect anything you cannot justify.

## What to write in your journal

One short paragraph: the riskiest thing about your project from this list, what
you did about it, and what you knowingly accepted. A student who can name the
tradeoff they made scores better than one who claims there was none.

## Journal

**Riskiest thing:** the admin. One service role key can do anything in the
Supabase project, and the admin API can edit or delete the whole portfolio.

**What I did:** the key lives only in `server/.env` (git-ignored, never in a
commit) and on the host; the client only has the public anon key. Every
`/api/admin` route needs a genuine token *and* a row in `admins`, so switching
sign-ups on would not let a stranger in. All queries are parameterised, text
fields have server-side length limits, JSON bodies are capped at 100 kb, and
CORS names its origins. Before submitting I added `helmet` (with
`crossOriginResourcePolicy: cross-origin` so the public `/api/img` pictures still
load across origins) and ran `npm audit fix` on the server and client, which
cleared every reported vulnerability.

**Knowingly accepted:** no rate limiting of my own. Nothing here costs money,
and sign-in is Supabase's, which throttles it. The public `/api/img` route does
resize images on demand, so a determined visitor could make it work hard; I
accepted that for a small portfolio and would add `express-rate-limit` there
first if traffic grew. The repo also holds no personal data of anyone but the
artist, whose contact email is public on purpose.
