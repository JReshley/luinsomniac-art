// Works: every artwork, 3D model and video, in one list. Future endpoints:
//   GET    /api/admin/works          listWorks(filters)
//   GET    /api/admin/works/:id      getWork(id)
//   POST   /api/admin/works          createWork(input)
//   PATCH  /api/admin/works/:id      updateWork(id, changes)
//
// There's no delete. "Delete" in the admin archives, so a work can always be
// brought back (setWorkStatus(id, 'draft')).

import { ApiError, findRow, logActivity, mutate, newId, query } from './db.js'
import { is3dCategory, KINDS, STATUSES, publishBlockers } from './shared.js'
import { resolveMediaUrls } from './media.js'
import { slugify } from './seed.js'

// The fields a caller may set. Anything else in the input is ignored, the way
// the Express route will only copy known columns.
const WORK_FIELDS = [
  'slug', 'title', 'year', 'categoryId', 'categoryIds', 'description', 'tags', 'coverMediaId', 'featured',
  'sortOrder', 'status', 'isOwnWork', 'showsRealFace', 'faceConsent', 'notesArtist', 'notesAdmin',
]
// The home page shows up to this many featured works, in featuredOrder.
export const FEATURED_LIMIT = 9

// After a save: an archived work stops being featured, and a work newly
// marked featured goes to the end of the home page's row, if there's room.
export function placeFeatured(db, work, wasFeatured) {
  if (work.status === 'archived') work.featured = false
  if (!work.featured || wasFeatured) return
  const others = db.works.filter((other) => other.id !== work.id && other.featured && other.status !== 'archived')
  if (others.length >= FEATURED_LIMIT) {
    invalid('featured', `The home page already shows ${FEATURED_LIMIT} featured works. Remove one under Site settings → Home page first.`)
  }
  work.featuredOrder = Math.max(-1, ...others.map((other) => other.featuredOrder ?? 0)) + 1
}

// The categories a work is in, in its order, as rows.
export const categoriesOf = (db, work) => (work.categoryIds ?? []).map((id) => db.categories.find((category) => category.id === id)).filter(Boolean)

const MODEL_FIELDS = ['software', 'processNotes', 'modelMediaId', 'turntableMediaId', 'polyCount', 'textured', 'externalUrl']
const VIDEO_FIELDS = ['mediaId', 'duration', 'audioCleared', 'relatedWorkId']

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// What's missing or wrong on a work, for the dashboard's "Needs attention"
// and the works list. Archived works are left alone.
export function workProblems(db, work) {
  if (work.status === 'archived') return []
  const problems = publishBlockers(work).map((reason) => ({ level: 'blocker', message: reason }))
  const add = (message) => problems.push({ level: 'missing', message })

  if (!work.coverMediaId) add('No cover image')
  // Saved as an artwork before 3D categories made works 3D models: the 3D
  // Showcase lists it, but it has no 3D details until it's saved again.
  if (work.kind === 'artwork' && db.categories && categoriesOf(db, work).some(is3dCategory)) add('In a 3D category: open and save it to add its 3D details')
  if (work.kind === 'model' && !db.modelDetails.find((d) => d.workId === work.id)?.modelMediaId) add('No .glb file')
  if (work.kind === 'video' && !db.videoDetails.find((d) => d.workId === work.id)?.mediaId) add('No YouTube link')

  const cover = db.media.find((media) => media.id === work.coverMediaId)
  if (cover && !cover.altText?.trim()) add('Cover image has no alt text')

  return problems
}

// --- Reading --------------------------------------------------------------

// A works row joined with what the screens need alongside it.
function present(db, work) {
  const media = (id) => db.media.find((item) => item.id === id) ?? null
  return {
    ...work,
    categories: categoriesOf(db, work),
    // The first category, for screens that show one.
    category: categoriesOf(db, work)[0] ?? null,
    cover: media(work.coverMediaId),
    gallery: db.workMedia
      .filter((link) => link.workId === work.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((link) => {
        const item = media(link.mediaId)
        return item && { ...item, caption: link.caption ?? '' }
      })
      .filter(Boolean),
    model: work.kind === 'model' ? db.modelDetails.find((d) => d.workId === work.id) ?? null : null,
    video: work.kind === 'video' ? db.videoDetails.find((d) => d.workId === work.id) ?? null : null,
    problems: workProblems(db, work),
    updatedByName: db.admins.find((admin) => admin.userId === work.updatedBy)?.displayName ?? null,
  }
}

// Filters, all optional:
//   kind        'artwork' | 'model' | 'video'
//   status      one status; without it, archived works are left out
//   categoryId
//   search      matches the title, slug and tags
//   attention   true for only the works with problems
export async function listWorks({ kind, status, categoryId, search, attention } = {}) {
  const term = search?.trim().toLowerCase()
  const works = await query((db) =>
    db.works
      .filter((work) => (status ? work.status === status : work.status !== 'archived'))
      .filter((work) => !kind || work.kind === kind)
      .filter((work) => !categoryId || (work.categoryIds ?? []).includes(categoryId))
      .filter((work) => !term || [work.title, work.slug, ...work.tags].some((text) => text.toLowerCase().includes(term)))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((work) => present(db, work))
      .filter((work) => !attention || work.problems.length > 0)
  )
  return resolveMediaUrls(works)
}

export async function getWork(id) {
  const work = await query((db) => present(db, findRow(db.works, id, 'work')))
  return resolveMediaUrls(work)
}

// --- Writing --------------------------------------------------------------

// input: { kind, title, ...any WORK_FIELDS, model: {...}, video: {...}, gallery: [{ mediaId, caption }] }
// A blank slug is made from the title, with -2, -3… added if it's taken.
// New works are drafts unless the input says otherwise.
export async function createWork(input) {
  return mutate((db, ctx) => {
    if (!KINDS.includes(input.kind)) throw new ApiError('invalid', 'Choose whether this is an artwork, a 3D model or a video.', { field: 'kind' })

    const work = {
      id: newId(),
      kind: input.kind,
      slug: '',
      title: '',
      year: null,
      categoryId: null,
      description: '',
      tags: [],
      coverMediaId: null,
      featured: false,
      featuredOrder: 0,
      categoryIds: [],
      sortOrder: Math.max(-1, ...db.works.map((row) => row.sortOrder)) + 1,
      status: 'draft',
      isOwnWork: true,
      showsRealFace: false,
      faceConsent: false,
      notesArtist: '',
      notesAdmin: '',
      createdAt: ctx.now,
      updatedAt: ctx.now,
      updatedBy: ctx.actorId,
      ...pick(input, WORK_FIELDS),
    }
    if (!input.slug?.trim()) work.slug = uniqueSlug(db, slugify(work.title ?? ''), work.id)
    if (!Array.isArray(work.categoryIds)) work.categoryIds = work.categoryId ? [work.categoryId] : []
    if (work.kind === 'artwork' && categoriesOf(db, work).some(is3dCategory)) work.kind = 'model'

    validateWork(db, work)
    placeFeatured(db, work, false)
    db.works.push(work)

    if (work.kind === 'model') {
      const details = { workId: work.id, software: [], processNotes: '', modelMediaId: null, turntableMediaId: null, polyCount: null, textured: false, externalUrl: null }
      db.modelDetails.push(Object.assign(details, pick(input.model ?? {}, MODEL_FIELDS)))
      validateModel(db, details)
    }
    if (work.kind === 'video') {
      const details = { workId: work.id, mediaId: null, duration: null, audioCleared: false, relatedWorkId: null }
      db.videoDetails.push(Object.assign(details, pick(input.video ?? {}, VIDEO_FIELDS)))
      validateVideo(db, details)
    }
    if (input.gallery) setGallery(db, work.id, input.gallery)

    logActivity(db, ctx, 'create', 'work', work.id, `Added “${work.title}”`)
    return present(db, work)
  }).then(resolveMediaUrls)
}

// changes: any WORK_FIELDS, plus `kind` (changes the type: the old type's
// details are dropped and the new type's start empty), `model` / `video`
// (merged into the details) and `gallery` (replaces the gallery, in order).
export async function updateWork(id, changes) {
  return mutate((db, ctx) => {
    const work = findRow(db.works, id, 'work')
    const before = { ...work }

    // The type asked for, unless the category makes it a 3D model.
    let nextKind = changes.kind ?? work.kind
    const nextCategoryIds = changes.categoryIds ?? (changes.categoryId !== undefined ? [changes.categoryId] : work.categoryIds) ?? []
    if (nextKind === 'artwork' && categoriesOf(db, { categoryIds: nextCategoryIds }).some(is3dCategory)) nextKind = 'model'
    if (nextKind !== work.kind) {
      if (!KINDS.includes(nextKind)) throw new ApiError('invalid', 'Pick a type: artwork, 3D model or video.', { field: 'kind' })
      db.modelDetails = db.modelDetails.filter((d) => d.workId !== id)
      db.videoDetails = db.videoDetails.filter((d) => d.workId !== id)
      work.kind = nextKind
      if (work.kind === 'model') db.modelDetails.push({ workId: id, software: [], processNotes: '', modelMediaId: null, turntableMediaId: null, polyCount: null, textured: false, externalUrl: null })
      if (work.kind === 'video') db.videoDetails.push({ workId: id, mediaId: null, duration: null, audioCleared: false, relatedWorkId: null })
    }

    Object.assign(work, pick(changes, WORK_FIELDS), { updatedAt: ctx.now, updatedBy: ctx.actorId })
    validateWork(db, work)
    placeFeatured(db, work, before.featured && before.status !== 'archived')

    if (changes.model && work.kind === 'model') {
      const details = db.modelDetails.find((d) => d.workId === id)
      validateModel(db, Object.assign(details, pick(changes.model, MODEL_FIELDS)))
    }
    if (changes.video && work.kind === 'video') {
      const details = db.videoDetails.find((d) => d.workId === id)
      validateVideo(db, Object.assign(details, pick(changes.video, VIDEO_FIELDS)))
    }
    if (changes.gallery) setGallery(db, id, changes.gallery)

    logActivity(db, ctx, activityAction(before, work), 'work', id, activitySummary(before, work))
    return present(db, work)
  }).then(resolveMediaUrls)
}

export const setWorkStatus = (id, status) => updateWork(id, { status })

// The home page's featured works, in order: these ids are featured (up to
// FEATURED_LIMIT, published only) and every other work isn't.
export function setFeaturedWorks(ids) {
  return mutate((db, ctx) => {
    const list = [...new Set(ids ?? [])]
    if (list.length > FEATURED_LIMIT) throw new ApiError('invalid', `The home page shows up to ${FEATURED_LIMIT} featured works.`)
    for (const id of list) {
      const work = findRow(db.works, id, 'work')
      if (work.status !== 'published') throw new ApiError('invalid', `Publish “${work.title}” before featuring it; only published works show on the home page.`)
    }
    for (const work of db.works) {
      const index = list.indexOf(work.id)
      work.featured = index !== -1
      if (index !== -1) work.featuredOrder = index
    }
    logActivity(db, ctx, 'update', 'work', null, 'Changed the featured works')
  })
}

// What the admin calls "Delete".
export const archiveWork = (id) => setWorkStatus(id, 'archived')

// --- Helpers --------------------------------------------------------------

function pick(source, fields) {
  return Object.fromEntries(fields.filter((field) => source[field] !== undefined).map((field) => [field, source[field]]))
}

function uniqueSlug(db, base, ownId) {
  const root = base || 'untitled'
  const taken = (slug) => db.works.some((work) => work.slug === slug && work.id !== ownId)
  let slug = root
  for (let n = 2; taken(slug); n++) slug = `${root}-${n}`
  return slug
}

function invalid(field, message) {
  throw new ApiError('invalid', message, { field })
}

function validateWork(db, work) {
  work.title = String(work.title ?? '').trim()
  if (!work.title) invalid('title', 'Give the work a title.')
  if (work.title.length > 200) invalid('title', 'Keep the title under 200 characters.')

  work.slug = String(work.slug ?? '').trim().toLowerCase()
  if (!SLUG_PATTERN.test(work.slug)) invalid('slug', 'Use only lowercase letters, numbers and single hyphens in the slug, like “night-street”.')
  if (db.works.some((other) => other.slug === work.slug && other.id !== work.id)) {
    throw new ApiError('conflict', `Another work already uses the slug “${work.slug}”.`, { field: 'slug' })
  }

  if (work.year !== null && work.year !== '') {
    work.year = Number(work.year)
    if (!Number.isInteger(work.year) || work.year < 1900 || work.year > 2100) invalid('year', 'Enter the year as four digits, like 2026.')
  } else {
    work.year = null
  }

  // Any number of categories, each once, in the order picked. categoryId
  // keeps the first, for anything that still reads one.
  if (!Array.isArray(work.categoryIds)) work.categoryIds = work.categoryId ? [work.categoryId] : []
  work.categoryIds = [...new Set(work.categoryIds.filter(Boolean))]
  if (work.categoryIds.some((id) => !db.categories.some((category) => category.id === id))) invalid('categoryIds', 'One of those categories no longer exists. Pick again.')
  work.categoryId = work.categoryIds[0] ?? null
  if (work.coverMediaId && !db.media.some((media) => media.id === work.coverMediaId)) invalid('coverMediaId', 'That cover image no longer exists. Pick another.')
  if (!STATUSES.includes(work.status)) invalid('status', 'Pick a status: draft, ready, published or archived.')

  // Lowercase, trimmed and without repeats, so "Props" and "props " are one tag.
  work.tags = [...new Set((work.tags ?? []).map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))]

  for (const flag of ['featured', 'isOwnWork', 'showsRealFace', 'faceConsent']) work[flag] = Boolean(work[flag])

  if (work.status === 'published') {
    const reasons = publishBlockers(work)
    if (reasons.length) throw new ApiError('publish_blocked', `“${work.title}” can’t be published yet. ${reasons.join(' ')}`, { reasons })
  }
}

function validateModel(db, details) {
  details.software = [...new Set((details.software ?? []).map((name) => String(name).trim()).filter(Boolean))]
  for (const field of ['modelMediaId', 'turntableMediaId']) {
    if (details[field] && !db.media.some((media) => media.id === details[field])) invalid(field, 'That file no longer exists. Pick another.')
  }
  const model = db.media.find((media) => media.id === details.modelMediaId)
  if (model && (model.kind !== 'model' || model.source !== 'supabase')) {
    invalid('modelMediaId', 'The 3D viewer needs an uploaded .glb file. Drive and other links don’t load in it.')
  }
  if (details.polyCount !== null && details.polyCount !== '') {
    details.polyCount = Number(details.polyCount)
    if (!Number.isInteger(details.polyCount) || details.polyCount < 0) invalid('polyCount', 'Enter the triangle count as a whole number.')
  } else {
    details.polyCount = null
  }
  details.textured = Boolean(details.textured)
  if (details.externalUrl && !/^https:\/\//.test(details.externalUrl)) invalid('externalUrl', 'Links need to start with https://')
  details.externalUrl ||= null
}

function validateVideo(db, details) {
  const media = db.media.find((item) => item.id === details.mediaId)
  if (details.mediaId && !media) invalid('mediaId', 'That video no longer exists. Pick another.')
  if (media && media.source !== 'youtube') invalid('mediaId', 'Videos are YouTube links. Add the video on YouTube, then paste its link.')
  if (details.relatedWorkId && !db.works.some((work) => work.id === details.relatedWorkId)) invalid('relatedWorkId', 'That related work no longer exists.')
  if (details.duration !== null && details.duration !== '') {
    details.duration = Number(details.duration)
    if (!Number.isInteger(details.duration) || details.duration < 0) invalid('duration', 'Enter the length in whole seconds.')
  } else {
    details.duration = null
  }
  details.audioCleared = Boolean(details.audioCleared)
}

// The gallery is an ordered list of images and YouTube videos, with an optional
// caption on each, for any kind of work. 3D models can't go in it: the model
// has its own slot. Each file appears once.
function setGallery(db, workId, items) {
  const seen = new Set()
  const rows = []
  for (const { mediaId, caption } of items) {
    const media = db.media.find((item) => item.id === mediaId)
    if (!media) invalid('gallery', 'One of the gallery files no longer exists.')
    if (media.kind === 'model') invalid('gallery', 'The gallery takes images and videos. A 3D model goes in the model field.')
    const text = String(caption ?? '').trim()
    if (text.length > 200) invalid('gallery', 'Keep each caption under 200 characters.')
    if (!seen.has(mediaId)) rows.push({ workId, mediaId, caption: text, sortOrder: rows.length })
    seen.add(mediaId)
  }
  db.workMedia = db.workMedia.filter((link) => link.workId !== workId).concat(rows)
}

function activityAction(before, after) {
  if (before.status === after.status) return 'update'
  if (after.status === 'archived') return 'archive'
  if (after.status === 'published') return 'publish'
  if (before.status === 'archived') return 'restore'
  return 'status'
}

function activitySummary(before, after) {
  const title = `“${after.title}”`
  switch (activityAction(before, after)) {
    case 'archive': return `Archived ${title}`
    case 'publish': return `Published ${title}`
    case 'restore': return `Restored ${title} as ${after.status}`
    case 'status': return `Moved ${title} to ${after.status}`
    default: return `Edited ${title}`
  }
}
