# AI usage

This project was built with AI assistance. This file is the record of it.

**Tool:** Claude Code (Anthropic), in the Claude desktop app, for the whole
project. I used no other AI tools.

**How much:** a lot. I designed the site in Figma, set the order of the work and
made the product decisions (what the admin should do, what the database should
model, what the public pages show). Claude typed most of the code from those
plans, and I tested every feature in the browser and sent it back when it was
wrong. My own hand-written code is listed in section 3.

**How I worked with it:** for bigger features I made Claude brainstorm with me
first and give me options to choose from, round by round, before it wrote any
code. Small fixes I either asked for directly or made myself.

Repository: https://github.com/JReshley/luinsomniac-art

## 1. How I used AI

### 2026-10-02 - Museum page with filters, masonry grid and Load more

- **Tool:** Claude Code
- **What I asked for:** the Museum page from my Figma wireframe: category filter
  chips, a masonry grid of work cards, a Load more button, and video cards that
  stay quiet until hovered.
- **What it gave back:** the page, a `WorkCard` component and the filter logic.
  Only video cards turned navy on hover; the others just got a darker border.
- **What I kept, what I changed, and why:** I kept the grid and filters. I didn't
  like that only video cards reacted, so I had every card take the navy hover
  (4c4a88a). Then I changed the hover myself so the **title** turns orange
  instead of the category tag (15043a8), because the title is what you read
  first, and the orange tag competed with it.
- **Commit:** https://github.com/JReshley/luinsomniac-art/commit/b65828e2644c76b653757e533dbaa48c514c3fd5
  (follow-ups: https://github.com/JReshley/luinsomniac-art/commit/4c4a88a65907c17a3f5e954124aff7c020b1b3cf,
  https://github.com/JReshley/luinsomniac-art/commit/15043a8e47806897eb5955bdbefbe2ddecc04a11)

### 2026-10-02 - Playful motion across the site

- **Tool:** Claude Code
- **What I asked for:** motion that fits a 3D/animation artist: a hero
  entrance, animated page titles, a wipe between pages, and some squash and
  swing on buttons and cards, all switched off for people who ask for reduced
  motion.
- **What it gave back:** a hero sequence, letter-by-letter titles, a page wipe
  using the View Transitions API, card swing and button squash (21 files).
- **What I kept, what I changed, and why:** I kept most of it. The page wipe
  had a bug (see section 2, case 3).
- **Commit:** https://github.com/JReshley/luinsomniac-art/commit/fd76da904f47dbbf4f378f769d3554e0384bfd31

### 2026-10-03 - Waving Lucas in the hero

- **Tool:** Claude Code
- **What I asked for:** Luis' 3D character Lucas waving in the hero, using a
  still image and an animation Luis rendered.
- **What it gave back:** a component that swapped a PNG for a GIF on a loop.
- **What I kept, what I changed, and why:** the first version jumped at the end
  of each loop, because the still and the GIF came from different frames, and
  the GIF was 6.6 MB. I sent it back. The fix cut a still and an animated WebP
  from the same frames (2.4 MB instead of 6.6 MB) and decodes the animation
  before swapping it in, so there's no blank flash.
- **Commit:** https://github.com/JReshley/luinsomniac-art/commit/bbdba2ce621791e81b9fd8404352bf58c557728e
  (fix: https://github.com/JReshley/luinsomniac-art/commit/2a0eb7d27e0add82d3b5bcf45df0fe204f68eb56)

### 2026-10-03 - Planning the admin dashboard, then building it on a mock

- **Tool:** Claude Code
- **What I asked for:** a private admin so Luis and I can add works without
  touching code. I asked Claude to plan it with me in rounds of options before
  writing anything.
- **What it gave back:** a plan (kept in the git-ignored `private/` folder), then
  the admin shell with protected routes, a mock data layer that saves in the
  browser and has the same functions the real API would have, and the works,
  media, categories, text, links and brand screens.
- **What I kept, what I changed, and why:** I chose the build order: UI first on
  a mock, then the schema, then the real API. That way I could click through
  the admin and fix the flow before any database existed. I also made the
  calls on routes, auth (Supabase Auth with sign-ups off, plus an `admins`
  allowlist), and keeping private planning out of the public repo.
- **Commit:** https://github.com/JReshley/luinsomniac-art/commit/ec59299655c7f9108585e6576d5f80b1192000a6
  (mock layer: https://github.com/JReshley/luinsomniac-art/commit/4f302a6c907cc7ff032c6582908fb499255c65d3)

### 2026-10-03 - The Postgres schema

- **Tool:** Claude Code
- **What I asked for:** a schema designed properly for the site, not a 1:1 copy
  of the Google Sheet Luis and I had been using for content.
- **What it gave back:** `server/db/schema.sql` and a seed file: one `works`
  table with `model_details` and `video_details` side tables, a central `media`
  table, ordered categories, site settings and an activity log.
- **What I kept, what I changed, and why:** I decided what to model and what to
  leave in the sheet (consent answers stay there). I insisted on the publish
  rule living in the database, so a work that isn't Luis' own, or that shows a
  real face without consent, can't be published even if a screen forgets to
  check. I edited the schema as the site grew (several categories per work,
  featured order, 3D details).
- **Commit:** https://github.com/JReshley/luinsomniac-art/commit/b97d819eee080b1365be9fa0219db5aac630727f

### 2026-10-03 - Express API, Supabase sign-in and uploads

- **Tool:** Claude Code
- **What I asked for:** the real backend: Express routes for the public site
  and the admin, Supabase Auth to check who is signed in, and uploads to a
  Supabase Storage bucket. The browser mock had to stay available behind
  `VITE_USE_MOCK_API` so the site still works if the free tier is asleep.
- **What it gave back:** the Express app, routes, auth middleware, upload
  handling and `.env.example` files.
- **What I kept, what I changed, and why:** I kept the structure. But it put my
  real keys in a committed `.env.example` (section 2, case 1).
- **Commit:** https://github.com/JReshley/luinsomniac-art/commit/389de77e325c12eb43b0a0a60d4867776339020d

### 2026-10-03 - Deploying the API as a Vercel function

- **Tool:** Claude Code
- **What I asked for:** a way to deploy the site and the API together, without
  a second host.
- **What it gave back:** `api/index.js`, which wraps the Express app as a
  Vercel serverless function, plus rewrites in `vercel.json`.
- **What I kept, what I changed, and why:** I kept it, because one project is
  easier for me to manage. The first deploy failed because Vercel skipped the
  client's build tools, which needed a follow-up fix (d9fcd26).
- **Commit:** https://github.com/JReshley/luinsomniac-art/commit/97b241dd6dde8e13ba34d2a7c795abe05338513a

### 2026-10-03 - Simplifying the admin after testing it myself

- **Tool:** Claude Code
- **What I asked for:** after I clicked through every admin screen, I asked for
  a UX audit and gave Claude my own list of what was confusing.
- **What it gave back:** a rework of the works editor, the works list, media and
  a new Site settings page.
- **What I kept, what I changed, and why:** the choices were mine (section 2,
  case 2): hide fields the public site never shows, cut status to Draft or
  Published with a separate Archive, and merge three pages into one.
- **Commit:** https://github.com/JReshley/luinsomniac-art/commit/3aa2618d330664f5612fbc5c1ae48232034d0bd8

### 2026-10-06 - Review of my Museum search box

- **Tool:** Claude Code
- **What I asked for:** a review of the search box I wrote myself (section 3),
  and then for it to fix what it found.
- **What it gave back:** five points. My logic was right, but `outline-none`
  removed the keyboard focus ring. When nothing matched, the "End of the
  halls, that's everything on display" note still showed under my "No works
  match" message. I used `bg-white` instead of the site's `bg-surface` token,
  the padding was too big for the site's 8px spacing, and my indentation was
  off.
- **What I kept, what I changed, and why:** I kept my search logic as it was.
  I accepted all five fixes, the focus ring one most of all, because without
  it keyboard users can't see where they are. I committed my version first and
  the fixes separately, so it's clear which lines are mine.
- **Commit:** https://github.com/JReshley/luinsomniac-art/commit/ecceaca43424077b7df33059f3b076414352e17d

## 2. Where the AI got it wrong

Three cases. Be specific. If you write that the AI was never wrong, this section
scores zero.

### Case 1 - short title

- **What it gave me:**
- **What was wrong with it:**
- **What I did instead:**
- **Commit:** https://github.com/YOUR-USERNAME/YOUR-REPO/commit/SHA

## 3. Who wrote what

At least a fifth of this project is code you wrote yourself. Name it, and explain
it in your own words.

> Group projects: give each member their own heading below, and use your GitHub
> handle as the heading. You are graded on your own section.

### Written by me

- **File:**
- **Commit:**
- **What it does and why it is built this way:**

### The AI-written part I understand best

- **File:**
- **Commit:**
- **What it does and why we kept it:**
