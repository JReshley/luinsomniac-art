// What the public site reads (phase 5 switches its pages over to these).
// Future endpoints, which need no sign-in:
//   GET /api/works             listPublishedWorks(filters)
//   GET /api/works/:slug       getPublishedWork(slug)
//   GET /api/categories        listPublicCategories()
//   GET /api/site              getSiteContent()
//
// Only published works, and only the fields a visitor should see. Notes,
// consent flags, drafts and who edited what never leave the admin. Each
// function builds its result from an allowlist of fields rather than removing
// private ones, so a column added later stays private until it's listed here.

import { ApiError, query } from './db.js'
import { resolveMediaUrls } from './media.js'

const publicMedia = (media) =>
  media
    ? {
        // The mock finds an uploaded file by this (media.js urlsFor). Not
        // private: it's only an opaque id.
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

// Filters, all optional: kind, category (a slug), featured (true).
export async function listPublishedWorks({ kind, category, featured } = {}) {
  const works = await query((db) => {
    const categoryId = category && db.categories.find((item) => item.slug === category)?.id
    return published(db)
      .filter((work) => (!kind || work.kind === kind) && (!category || work.categoryId === categoryId) && (!featured || work.featured))
      .map((work) => publicWork(db, work))
  })
  return resolveMediaUrls(works)
}

// A draft or archived work is "not found", the same as one that doesn't exist.
export async function getPublishedWork(slug) {
  const work = await query((db) => {
    const row = published(db).find((item) => item.slug === slug)
    if (!row) throw new ApiError('not_found', 'There’s no work at this address.')
    return publicWork(db, row)
  })
  return resolveMediaUrls(work)
}

// The Museum's filter chips: in order, and only ones with published work.
export function listPublicCategories() {
  return query((db) =>
    [...db.categories]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .filter((category) => published(db).some((work) => work.categoryId === category.id))
      .map((category) => ({ name: category.name, slug: category.slug }))
  )
}

// Everything else the public pages show, in one request:
// { text: { 'home.hero.intro': '…' }, links: [...visible], email, displayName, logo, icon, portrait }
// logo, icon and portrait are null when the bundled copy should be used.
export async function getSiteContent() {
  const content = await query((db) => {
    const setting = (key) => db.settings.find((item) => item.key === key)
    const image = (key) => publicMedia(db.media.find((media) => media.id === setting(key)?.mediaId))
    return {
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
    }
  })
  return resolveMediaUrls(content)
}
