import { Router } from 'express'
import { pool } from '../db/pool.js'
import { ApiError, route } from '../errors.js'
import { protectArtwork, resolveMediaUrls } from '../mediaFiles.js'
import { loadDb } from '../rows.js'
import { categoriesOf, FEATURED_LIMIT, is3dCategory } from '../workRules.js'

// What the public site reads. No sign-in needed, so every field is picked from
// an allowlist rather than copied and stripped: only published works, and only
// what a visitor should see. Notes, consent flags, drafts and who edited what
// never leave the admin, and a column added later stays private until it is
// listed here.

// The tables each answer is built from, and no more: they're read all at once
// from the pool, but every extra table is still more for the database to send.
const WORK_TABLES = ['works', 'media', 'categories', 'modelDetails', 'videoDetails', 'workMedia']
const CATEGORY_TABLES = ['works', 'categories']
const SITE_TABLES = ['media', 'siteText', 'socialLinks', 'settings']
const load = (tables) => loadDb(pool, tables, { parallel: true })

// The About page's experience rows, in order. Read on their own, and a
// database that doesn't have the table yet (schema.sql not run since it was
// added) answers null, so the site keeps its own copy instead of failing.
async function publicExperience() {
  try {
    const { rows } = await pool.query('SELECT id, years, role, detail FROM experience ORDER BY sort_order')
    return rows
  } catch (error) {
    if (error.code === '42P01') return null // undefined_table
    throw error
  }
}

const publicMedia = (media) =>
  media
    ? {
        // Only an opaque id; /api/img finds an artwork picture by it.
        id: media.id,
        source: media.source,
        kind: media.kind,
        storagePathOrUrl: media.storagePathOrUrl,
        width: media.width,
        height: media.height,
        altText: media.altText,
      }
    : null

function publicWork(db, work) {
  const media = (id) => publicMedia(db.media.find((item) => item.id === id))
  const categories = categoriesOf(db, work).map((item) => ({ name: item.name, slug: item.slug }))
  const model = work.kind === 'model' && db.modelDetails.find((d) => d.workId === work.id)
  const video = work.kind === 'video' && db.videoDetails.find((d) => d.workId === work.id)
  const related = video?.relatedWorkId && db.works.find((item) => item.id === video.relatedWorkId && item.status === 'published')

  return {
    slug: work.slug,
    kind: shownKind(db, work),
    title: work.title,
    year: work.year,
    categories,
    // The first category, for anything that shows one.
    category: categories[0] ?? null,
    description: work.description,
    tags: work.tags,
    featured: work.featured,
    cover: media(work.coverMediaId),
    gallery: db.workMedia
      .filter((link) => link.workId === work.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((link) => {
        const item = media(link.mediaId)
        return item && { ...item, caption: link.caption ?? '', pass: link.pass ?? '' }
      })
      .filter(Boolean),
    model: model
      ? {
          client: model.client ?? '',
          role: model.role ?? '',
          software: model.software,
          processNotes: model.processNotes,
          file: media(model.modelMediaId),
          turntable: media(model.turntableMediaId),
          polyCount: model.polyCount,
          textured: model.textured,
          externalUrl: model.externalUrl,
        }
      : null,
    video: video ? { file: media(video.mediaId), duration: video.duration, relatedWorkSlug: related?.slug ?? null } : null,
  }
}

// How the public site treats a work: an artwork in a 3D category is a 3D
// model (saved before that rule, or not saved since), so the 3D Showcase
// lists it. It has no 3D details until it's saved again.
const shownKind = (db, work) =>
  work.kind === 'artwork' && categoriesOf(db, work).some(is3dCategory) ? 'model' : work.kind

const published = (db) => db.works.filter((work) => work.status === 'published').sort((a, b) => a.sortOrder - b.sortOrder)

export function publicRoutes({ storage }) {
  const router = Router()
  const withUrls = (value) => resolveMediaUrls(value, storage)
  // Works' pictures are shown watermarked, from /api/img (routes/images.js).
  const withArtUrls = (value) => protectArtwork(withUrls(value))

  // A short cache: the site reads this on every page, and a change in the
  // admin only needs to show up within a minute. Vercel's CDN answers from a
  // copy for 30 seconds, and for 30 more while it fetches a fresh one in the
  // background, so most visitors never wait on the database. Browsers check
  // back every time instead (no-cache; an unchanged answer is a quick 304):
  // a copy of their own would push an edit past the minute.
  router.use((request, response, next) => {
    response.set('Vercel-CDN-Cache-Control', 'max-age=30, stale-while-revalidate=30')
    response.set('Cache-Control', 'no-cache')
    next()
  })

  // Filters, all optional: kind, category (a slug), featured=true.
  router.get('/works', route(async (request, response) => {
    const { kind, category, featured } = request.query
    const db = await load(WORK_TABLES)
    const categoryId = category && db.categories.find((item) => item.slug === category)?.id
    const works = published(db)
      .filter((work) => (!kind || shownKind(db, work) === kind) && (!category || work.categoryIds.includes(categoryId)) && (featured !== 'true' || work.featured))
      // The featured row: in the admin's order, at most FEATURED_LIMIT.
      .sort((a, b) => (featured === 'true' ? a.featuredOrder - b.featuredOrder : 0))
      .slice(0, featured === 'true' ? FEATURED_LIMIT : undefined)
      .map((work) => publicWork(db, work))
    response.json(withArtUrls(works))
  }))

  // A draft or archived work is "not found", the same as one that doesn't exist.
  router.get('/works/:slug', route(async (request, response) => {
    const db = await load(WORK_TABLES)
    const row = published(db).find((item) => item.slug === request.params.slug)
    if (!row) throw new ApiError('not_found', 'There’s no work at this address.')
    response.json(withArtUrls(publicWork(db, row)))
  }))

  // The Museum's filter chips: in order, and only ones with published work.
  router.get('/categories', route(async (request, response) => {
    const db = await load(CATEGORY_TABLES)
    response.json(
      db.categories
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .filter((category) => published(db).some((work) => work.categoryIds.includes(category.id)))
        .map((category) => ({ name: category.name, slug: category.slug }))
    )
  }))

  // Everything else the public pages show, in one request:
  // { text, links: [...visible], email, displayName, logo, icon, portrait, homeReel }
  // logo, icon and portrait are null when the bundled copy should be used;
  // portrait and homeReel (a YouTube video) show a placeholder when null.
  router.get('/site', route(async (request, response) => {
    const [db, experience] = await Promise.all([load(SITE_TABLES), publicExperience()])
    const setting = (key) => db.settings.find((item) => item.key === key)
    const image = (key) => publicMedia(db.media.find((media) => media.id === setting(key)?.mediaId))
    response.json(
      withUrls({
        text: Object.fromEntries(db.siteText.map((entry) => [entry.key, entry.value])),
        links: db.socialLinks
          .filter((link) => link.visible)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((link) => ({ platform: link.platform, handle: link.handle, url: link.url })),
        email: setting('contact_email')?.value ?? null,
        displayName: setting('display_name')?.value ?? null,
        logo: image('logo'),
        icon: image('icon'),
        portrait: image('portrait'),
        homeReel: image('home_reel'),
        experience,
      })
    )
  }))

  return router
}
