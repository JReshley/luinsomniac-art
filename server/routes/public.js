import { Router } from 'express'
import { pool } from '../db/pool.js'
import { ApiError, route } from '../errors.js'
import { resolveMediaUrls } from '../mediaFiles.js'
import { loadDb } from '../rows.js'

// What the public site reads. No sign-in needed, so every field is picked from
// an allowlist rather than copied and stripped: only published works, and only
// what a visitor should see. Notes, consent flags, drafts and who edited what
// never leave the admin, and a column added later stays private until it is
// listed here.

const TABLES = ['works', 'media', 'categories', 'modelDetails', 'videoDetails', 'workMedia', 'siteText', 'socialLinks', 'settings']

const publicMedia = (media) =>
  media
    ? {
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
  const category = db.categories.find((item) => item.id === work.categoryId)
  const model = work.kind === 'model' && db.modelDetails.find((d) => d.workId === work.id)
  const video = work.kind === 'video' && db.videoDetails.find((d) => d.workId === work.id)
  const related = video?.relatedWorkId && db.works.find((item) => item.id === video.relatedWorkId && item.status === 'published')

  return {
    slug: work.slug,
    kind: work.kind,
    title: work.title,
    year: work.year,
    category: category ? { name: category.name, slug: category.slug } : null,
    description: work.description,
    tags: work.tags,
    featured: work.featured,
    cover: media(work.coverMediaId),
    gallery: db.workMedia
      .filter((link) => link.workId === work.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((link) => {
        const item = media(link.mediaId)
        return item && { ...item, caption: link.caption ?? '' }
      })
      .filter(Boolean),
    model: model
      ? {
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

const published = (db) => db.works.filter((work) => work.status === 'published').sort((a, b) => a.sortOrder - b.sortOrder)

export function publicRoutes({ storage }) {
  const router = Router()
  const withUrls = (value) => resolveMediaUrls(value, storage)

  // A short cache: the site reads this on every page, and a change in the
  // admin only needs to show up within a minute.
  router.use((request, response, next) => {
    response.set('Cache-Control', 'public, max-age=30')
    next()
  })

  // Filters, all optional: kind, category (a slug), featured=true.
  router.get('/works', route(async (request, response) => {
    const { kind, category, featured } = request.query
    const db = await loadDb(pool, TABLES)
    const categoryId = category && db.categories.find((item) => item.slug === category)?.id
    const works = published(db)
      .filter((work) => (!kind || work.kind === kind) && (!category || work.categoryId === categoryId) && (featured !== 'true' || work.featured))
      .map((work) => publicWork(db, work))
    response.json(withUrls(works))
  }))

  // A draft or archived work is "not found", the same as one that doesn't exist.
  router.get('/works/:slug', route(async (request, response) => {
    const db = await loadDb(pool, TABLES)
    const row = published(db).find((item) => item.slug === request.params.slug)
    if (!row) throw new ApiError('not_found', 'There’s no work at this address.')
    response.json(withUrls(publicWork(db, row)))
  }))

  // The Museum's filter chips: in order, and only ones with published work.
  router.get('/categories', route(async (request, response) => {
    const db = await loadDb(pool, TABLES)
    response.json(
      db.categories
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .filter((category) => published(db).some((work) => work.categoryId === category.id))
        .map((category) => ({ name: category.name, slug: category.slug }))
    )
  }))

  // Everything else the public pages show, in one request:
  // { text, links: [...visible], email, displayName, logo, icon, portrait }
  // logo, icon and portrait are null when the bundled copy should be used.
  router.get('/site', route(async (request, response) => {
    const db = await loadDb(pool, TABLES)
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
      })
    )
  }))

  return router
}
