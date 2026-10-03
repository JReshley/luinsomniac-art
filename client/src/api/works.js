// Works: every artwork, 3D model and video, in one list. Future endpoints:
//   GET    /api/admin/works          listWorks(filters)
//   GET    /api/admin/works/:id      getWork(id)
//   POST   /api/admin/works          createWork(input)
//   PATCH  /api/admin/works/:id      updateWork(id, changes)
//
// There's no delete. "Delete" in the admin archives, so a work can always be
// brought back (setWorkStatus(id, 'draft')).

import { ApiError, findRow, logActivity, mutate, newId, query } from './db.js'
import { resolveMediaUrls } from './media.js'
import { slugify } from './seed.js'

export const KINDS = ['artwork', 'model', 'video']
export const STATUSES = ['draft', 'ready', 'published', 'archived']

// The fields a caller may set. Anything else in the input is ignored, the way
// the Express route will only copy known columns.
const WORK_FIELDS = [
  'slug', 'title', 'year', 'categoryId', 'description', 'tags', 'coverMediaId', 'featured',
  'sortOrder', 'status', 'isOwnWork', 'showsRealFace', 'faceConsent', 'notesArtist', 'notesAdmin',
]
const MODEL_FIELDS = ['software', 'processNotes', 'modelMediaId', 'turntableMediaId', 'polyCount', 'textured', 'externalUrl']
const VIDEO_FIELDS = ['mediaId', 'duration', 'audioCleared', 'relatedWorkId']

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// --- The publish gate -----------------------------------------------------
// Why a work can't be published yet; empty when it can. Phase 4 makes the same
// rule a CHECK constraint, so the database refuses it even if a screen or
// route forgets to ask.
export function publishBlockers(work) {
  const reasons = []
  if (!work.isOwnWork) reasons.push('It isn’t marked as Lui’s own work. Only own work can be published.')
  if (work.showsRealFace && !work.faceConsent) reasons.push('It shows a real person’s face, and their consent isn’t recorded.')
  return reasons
}

// What's missing or wrong on a work, for the dashboard's "Needs attention"
// and the works list. Archived works are left alone.
export function workProblems(db, work) {
  if (work.status === 'archived') return []
  const problems = publishBlockers(work).map((reason) => ({ level: 'blocker', message: reason }))
  const add = (message) => problems.push({ level: 'missing', message })

  if (!work.coverMediaId) add('No cover image')
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
    category: db.categories.find((category) => category.id === work.categoryId) ?? null,
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
      .filter((work) => !categoryId || work.categoryId === categoryId)
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

    validateWork(db, work)
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

// changes: any WORK_FIELDS, plus `model` / `video` (merged into the details)
// and `gallery` (replaces the gallery, in that order). A work's kind
// can't change: make a new work instead.
export async function updateWork(id, changes) {
  return mutate((db, ctx) => {
    const work = findRow(db.works, id, 'work')
    const before = { ...work }

    Object.assign(work, pick(changes, WORK_FIELDS), { updatedAt: ctx.now, updatedBy: ctx.actorId })
    validateWork(db, work)

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

  if (work.categoryId && !db.categories.some((category) => category.id === work.categoryId)) invalid('categoryId', 'That category no longer exists. Pick another.')
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
