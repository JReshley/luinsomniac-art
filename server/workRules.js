// The rules about works that the routes check before writing, ported from the
// mock (client/src/api/works.js). The database enforces the same ones as
// constraints (schema.sql), so a route that forgets one can't save a bad row;
// these run first to say what's wrong in words, and name the field.

import { ApiError } from './errors.js'

export const KINDS = ['artwork', 'model', 'video']

// A category about 3D work ("3D", "3D props"…), by its name or slug. Works in
// one are 3D models: saving an artwork into one makes it a 3D model, and the
// 3D Showcase lists them, so a 3D piece can't be left out of it.
// The same rule as client/src/api/shared.js.
export const is3dCategory = (category) => /(^|[^a-z0-9])3d([^a-z0-9]|$)/i.test(`${category?.name ?? ''} ${category?.slug ?? ''}`)
export const STATUSES = ['draft', 'ready', 'published', 'archived']

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// The fields a caller may set. Anything else in a body is ignored.
export const WORK_FIELDS = [
  'slug', 'title', 'year', 'categoryId', 'description', 'tags', 'coverMediaId', 'featured',
  'sortOrder', 'status', 'isOwnWork', 'showsRealFace', 'faceConsent', 'notesArtist', 'notesAdmin',
]
export const MODEL_FIELDS = ['software', 'processNotes', 'modelMediaId', 'turntableMediaId', 'polyCount', 'textured', 'externalUrl']
export const VIDEO_FIELDS = ['mediaId', 'duration', 'audioCleared', 'relatedWorkId']

const invalid = (field, message) => {
  throw new ApiError('invalid', message, { field })
}

// Why a work can't be published yet; empty when it can.
export function publishBlockers(work) {
  const reasons = []
  if (!work.isOwnWork) reasons.push('It isn’t marked as Lui’s own work. Only own work can be published.')
  if (work.showsRealFace && !work.faceConsent) reasons.push('It shows a real person’s face, and their consent isn’t recorded.')
  return reasons
}

// What's missing or wrong on a work, for the dashboard's "Needs attention" and
// the works list. Archived works are left alone.
export function workProblems(db, work) {
  if (work.status === 'archived') return []
  const problems = publishBlockers(work).map((reason) => ({ level: 'blocker', message: reason }))
  const add = (message) => problems.push({ level: 'missing', message })

  if (!work.coverMediaId) add('No cover image')
  // Saved as an artwork before 3D categories made works 3D models: the 3D
  // Showcase lists it, but it has no 3D details until it's saved again.
  const category = db.categories?.find((item) => item.id === work.categoryId)
  if (work.kind === 'artwork' && is3dCategory(category)) add('In a 3D category: open and save it to add its 3D details')
  if (work.kind === 'model' && !db.modelDetails.find((d) => d.workId === work.id)?.modelMediaId) add('No .glb file')
  if (work.kind === 'video' && !db.videoDetails.find((d) => d.workId === work.id)?.mediaId) add('No YouTube link')

  const cover = db.media.find((media) => media.id === work.coverMediaId)
  if (cover && !cover.altText?.trim()) add('Cover image has no alt text')

  return problems
}

// A works row joined with what the screens need alongside it.
export function presentWork(db, work) {
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

// Each validator tidies the candidate row in place and throws on the first
// problem. `db` has the current tables, so it can check that what a work points
// at exists and that its slug is free.

export function validateWork(db, work) {
  work.title = String(work.title ?? '').trim()
  if (!work.title) invalid('title', 'Give the work a title.')
  if (work.title.length > 200) invalid('title', 'Keep the title under 200 characters.')

  work.slug = String(work.slug ?? '').trim().toLowerCase()
  if (!SLUG_PATTERN.test(work.slug)) invalid('slug', 'Use only lowercase letters, numbers and single hyphens in the slug, like “night-street”.')
  if (db.works.some((other) => other.slug === work.slug && other.id !== work.id)) {
    throw new ApiError('conflict', `Another work already uses the slug “${work.slug}”.`, { field: 'slug' })
  }

  if (work.year !== null && work.year !== '' && work.year !== undefined) {
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
  work.categoryId ||= null
  work.coverMediaId ||= null

  if (work.status === 'published') {
    const reasons = publishBlockers(work)
    if (reasons.length) throw new ApiError('publish_blocked', `“${work.title}” can’t be published yet. ${reasons.join(' ')}`, { reasons })
  }
}

export function validateModel(db, details) {
  details.software = [...new Set((details.software ?? []).map((name) => String(name).trim()).filter(Boolean))]
  for (const field of ['modelMediaId', 'turntableMediaId']) {
    details[field] ||= null
    if (details[field] && !db.media.some((media) => media.id === details[field])) invalid(field, 'That file no longer exists. Pick another.')
  }
  const model = db.media.find((media) => media.id === details.modelMediaId)
  if (model && (model.kind !== 'model' || model.source !== 'supabase')) {
    invalid('modelMediaId', 'The 3D viewer needs an uploaded .glb file. Drive and other links don’t load in it.')
  }
  if (details.polyCount !== null && details.polyCount !== '' && details.polyCount !== undefined) {
    details.polyCount = Number(details.polyCount)
    if (!Number.isInteger(details.polyCount) || details.polyCount < 0) invalid('polyCount', 'Enter the triangle count as a whole number.')
  } else {
    details.polyCount = null
  }
  details.textured = Boolean(details.textured)
  details.processNotes = String(details.processNotes ?? '')
  if (details.externalUrl && !/^https:\/\//.test(details.externalUrl)) invalid('externalUrl', 'Links need to start with https://')
  details.externalUrl ||= null
}

export function validateVideo(db, details) {
  details.mediaId ||= null
  details.relatedWorkId ||= null
  const media = db.media.find((item) => item.id === details.mediaId)
  if (details.mediaId && !media) invalid('mediaId', 'That video no longer exists. Pick another.')
  if (media && media.source !== 'youtube') invalid('mediaId', 'Videos are YouTube links. Add the video on YouTube, then paste its link.')
  if (details.relatedWorkId && !db.works.some((work) => work.id === details.relatedWorkId)) invalid('relatedWorkId', 'That related work no longer exists.')
  if (details.duration !== null && details.duration !== '' && details.duration !== undefined) {
    details.duration = Number(details.duration)
    if (!Number.isInteger(details.duration) || details.duration < 0) invalid('duration', 'Enter the length in whole seconds.')
  } else {
    details.duration = null
  }
  details.audioCleared = Boolean(details.audioCleared)
}

// The gallery is an ordered list of images and YouTube videos, with an optional
// caption on each, for any kind of work. 3D models can't go in it: the model has
// its own slot. Each file appears once. Returns the rows to store.
export function galleryRows(db, workId, items) {
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
  return rows
}

// A slug from a title, with -2, -3… added if it's taken.
export const slugify = (text) =>
  text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export function uniqueSlug(db, base, ownId) {
  const root = base || 'untitled'
  const taken = (slug) => db.works.some((work) => work.slug === slug && work.id !== ownId)
  let slug = root
  for (let n = 2; taken(slug); n++) slug = `${root}-${n}`
  return slug
}

export function activityAction(before, after) {
  if (before.status === after.status) return 'update'
  if (after.status === 'archived') return 'archive'
  if (after.status === 'published') return 'publish'
  if (before.status === 'archived') return 'restore'
  return 'status'
}

export function activitySummary(before, after) {
  const title = `“${after.title}”`
  switch (activityAction(before, after)) {
    case 'archive': return `Archived ${title}`
    case 'publish': return `Published ${title}`
    case 'restore': return `Restored ${title} as ${after.status}`
    case 'status': return `Moved ${title} to ${after.status}`
    default: return `Edited ${title}`
  }
}
