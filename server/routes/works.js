import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { pool, transaction } from '../db/pool.js'
import { logActivity } from '../activity.js'
import { ApiError, route } from '../errors.js'
import { resolveMediaUrls } from '../mediaFiles.js'
import { insertRow, loadDb, pick, updateRow } from '../rows.js'
import {
  activityAction, activitySummary, categoriesOf, FEATURED_LIMIT, galleryRows, is3dCategory, KINDS, placeFeatured, MODEL_FIELDS, presentWork, slugify, uniqueSlug,
  validateModel, validateVideo, validateWork, VIDEO_FIELDS, WORK_FIELDS,
} from '../workRules.js'

// Works: every artwork, 3D model and video. There's no delete route: the
// admin's "Delete" sets the status to archived, so a work can always come back.

const TABLES = ['works', 'media', 'categories', 'modelDetails', 'videoDetails', 'workMedia', 'admins']
// categoryIds is kept in work_categories (saveCategories), not a column.
const WORK_COLUMNS = [...WORK_FIELDS.filter((field) => field !== 'categoryIds'), 'featuredOrder', 'updatedBy']

// Replaces a work's categories with these, in this order.
async function saveCategories(client, workId, categoryIds) {
  await client.query('DELETE FROM work_categories WHERE work_id = $1', [workId])
  for (const [position, categoryId] of categoryIds.entries()) {
    await client.query('INSERT INTO work_categories (work_id, category_id, position) VALUES ($1, $2, $3)', [workId, categoryId, position])
  }
}

export function workRoutes({ storage }) {
  const router = Router()
  const withUrls = (value) => resolveMediaUrls(value, storage)
  const notFound = () => new ApiError('not_found', 'That work doesn’t exist. It may have been removed in another tab.')

  // Filters, all optional: kind, status (without it, archived works are left
  // out), categoryId, search (title, slug and tags), attention=true.
  router.get('/', route(async (request, response) => {
    const { kind, status, categoryId, search, attention } = request.query
    const term = String(search ?? '').trim().toLowerCase()
    const db = await loadDb(pool, TABLES)

    const works = db.works
      .filter((work) => (status ? work.status === status : work.status !== 'archived'))
      .filter((work) => !kind || work.kind === kind)
      .filter((work) => !categoryId || work.categoryIds.includes(categoryId))
      .filter((work) => !term || [work.title, work.slug, ...work.tags].some((text) => text.toLowerCase().includes(term)))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((work) => presentWork(db, work))
      .filter((work) => attention !== 'true' || work.problems.length > 0)
    response.json(withUrls(works))
  }))

  router.get('/:id', route(async (request, response) => {
    const db = await loadDb(pool, TABLES)
    const work = db.works.find((item) => item.id === request.params.id)
    if (!work) throw notFound()
    response.json(withUrls(presentWork(db, work)))
  }))

  // body: { kind, title, ...any WORK_FIELDS, model: {...}, video: {...}, gallery: [{ mediaId, caption }] }
  // A blank slug is made from the title. New works are drafts unless the body
  // says otherwise.
  router.post('/', route(async (request, response) => {
    const input = request.body ?? {}
    if (!KINDS.includes(input.kind)) throw new ApiError('invalid', 'Choose whether this is an artwork, a 3D model or a video.', { field: 'kind' })

    const id = await transaction(async (client) => {
      const db = await loadDb(client, TABLES)
      const work = {
        id: randomUUID(),
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
        sortOrder: Math.max(-1, ...db.works.map((row) => row.sortOrder)) + 1,
        status: 'draft',
        isOwnWork: true,
        showsRealFace: false,
        faceConsent: false,
        notesArtist: '',
        notesAdmin: '',
        updatedBy: request.admin.id,
        ...pick(input, WORK_FIELDS),
      }
      if (!String(input.slug ?? '').trim()) work.slug = uniqueSlug(db, slugify(String(work.title ?? '')), work.id)
      if (!Array.isArray(work.categoryIds)) work.categoryIds = work.categoryId ? [work.categoryId] : []
      if (work.kind === 'artwork' && categoriesOf(db, work).some(is3dCategory)) work.kind = 'model'
      validateWork(db, work)
      placeFeatured(db, work, false)
      await insertRow(client, 'works', work, ['id', 'kind', ...WORK_COLUMNS])
      await saveCategories(client, work.id, work.categoryIds)

      if (work.kind === 'model') {
        const details = {
          workId: work.id, client: '', role: '', software: [], processNotes: '', modelMediaId: null, turntableMediaId: null, polyCount: null, textured: false, externalUrl: null,
          ...pick(input.model, MODEL_FIELDS),
        }
        validateModel(db, details)
        await insertRow(client, 'model_details', details, ['workId', ...MODEL_FIELDS])
      }
      if (work.kind === 'video') {
        const details = { workId: work.id, mediaId: null, duration: null, audioCleared: false, relatedWorkId: null, ...pick(input.video, VIDEO_FIELDS) }
        validateVideo(db, details)
        await insertRow(client, 'video_details', details, ['workId', ...VIDEO_FIELDS])
      }
      if (input.gallery) {
        for (const row of galleryRows(db, work.id, input.gallery)) await insertRow(client, 'work_media', row, ['workId', 'mediaId', 'caption', 'pass', 'sortOrder'])
      }

      await logActivity(client, request.admin.id, 'create', 'work', work.id, `Added “${work.title}”`)
      return work.id
    })

    const db = await loadDb(pool, TABLES)
    response.status(201).json(withUrls(presentWork(db, db.works.find((work) => work.id === id))))
  }))

  // The home page's featured works, in order: body { ids }. These are featured
  // (up to FEATURED_LIMIT, published only) and every other work isn't.
  // Registered before /:id so "featured" isn't read as an id.
  router.put('/featured', route(async (request, response) => {
    const ids = [...new Set(request.body?.ids ?? [])]
    await transaction(async (client) => {
      const { works } = await loadDb(client, ['works'])
      if (ids.length > FEATURED_LIMIT) throw new ApiError('invalid', `The home page shows up to ${FEATURED_LIMIT} featured works.`)
      for (const id of ids) {
        const work = works.find((item) => item.id === id)
        if (!work) throw notFound()
        if (work.status !== 'published') throw new ApiError('invalid', `Publish “${work.title}” before featuring it; only published works show on the home page.`)
      }
      await client.query('UPDATE works SET featured = false WHERE featured AND NOT (id = ANY($1::uuid[]))', [ids])
      for (const [i, id] of ids.entries()) await client.query('UPDATE works SET featured = true, featured_order = $1 WHERE id = $2', [i, id])
      await logActivity(client, request.admin.id, 'update', 'work', null, 'Changed the featured works')
    })
    response.status(204).end()
  }))

  // body: any WORK_FIELDS, plus `kind` (changes the type: the old type's
  // details are dropped and the new type's start empty), `model` / `video`
  // (merged into the details) and `gallery` (replaces the gallery, in order).
  router.patch('/:id', route(async (request, response) => {
    const changes = request.body ?? {}
    const { id } = request.params

    await transaction(async (client) => {
      const db = await loadDb(client, TABLES)
      const work = db.works.find((item) => item.id === id)
      if (!work) throw notFound()
      const before = { ...work }

      // A new type: the details rows point at (id, kind), so the old ones go
      // first, then the kind changes, then the new type's empty row is made.
      // The type asked for, unless the category makes it a 3D model.
      let nextKind = changes.kind ?? work.kind
      const nextCategoryIds = changes.categoryIds ?? (changes.categoryId !== undefined ? [changes.categoryId] : work.categoryIds) ?? []
      if (nextKind === 'artwork' && categoriesOf(db, { categoryIds: nextCategoryIds }).some(is3dCategory)) nextKind = 'model'
      if (nextKind !== work.kind) {
        if (!KINDS.includes(nextKind)) throw new ApiError('invalid', 'Pick a type: artwork, 3D model or video.', { field: 'kind' })
        await client.query('DELETE FROM model_details WHERE work_id = $1', [id])
        await client.query('DELETE FROM video_details WHERE work_id = $1', [id])
        await client.query('UPDATE works SET kind = $1 WHERE id = $2', [nextKind, id])
        work.kind = nextKind
        db.modelDetails = db.modelDetails.filter((d) => d.workId !== id)
        db.videoDetails = db.videoDetails.filter((d) => d.workId !== id)
        if (work.kind === 'model') {
          const details = { workId: id, client: '', role: '', software: [], processNotes: '', modelMediaId: null, turntableMediaId: null, polyCount: null, textured: false, externalUrl: null }
          await insertRow(client, 'model_details', details, ['workId', ...MODEL_FIELDS])
          db.modelDetails.push(details)
        }
        if (work.kind === 'video') {
          const details = { workId: id, mediaId: null, duration: null, audioCleared: false, relatedWorkId: null }
          await insertRow(client, 'video_details', details, ['workId', ...VIDEO_FIELDS])
          db.videoDetails.push(details)
        }
      }

      Object.assign(work, pick(changes, WORK_FIELDS), { updatedBy: request.admin.id })
      validateWork(db, work)
      placeFeatured(db, work, before.featured && before.status !== 'archived')
      await updateRow(client, 'works', 'id', id, work, WORK_COLUMNS)
      if (changes.categoryIds !== undefined || changes.categoryId !== undefined) await saveCategories(client, id, work.categoryIds)

      if (changes.model && work.kind === 'model') {
        const details = db.modelDetails.find((d) => d.workId === id)
        Object.assign(details, pick(changes.model, MODEL_FIELDS))
        validateModel(db, details)
        await updateRow(client, 'model_details', 'workId', id, details, MODEL_FIELDS)
      }
      if (changes.video && work.kind === 'video') {
        const details = db.videoDetails.find((d) => d.workId === id)
        Object.assign(details, pick(changes.video, VIDEO_FIELDS))
        validateVideo(db, details)
        await updateRow(client, 'video_details', 'workId', id, details, VIDEO_FIELDS)
      }
      if (changes.gallery) {
        const rows = galleryRows(db, id, changes.gallery)
        await client.query('DELETE FROM work_media WHERE work_id = $1', [id])
        for (const row of rows) await insertRow(client, 'work_media', row, ['workId', 'mediaId', 'caption', 'pass', 'sortOrder'])
      }

      await logActivity(client, request.admin.id, activityAction(before, work), 'work', id, activitySummary(before, work))
    })

    const db = await loadDb(pool, TABLES)
    response.json(withUrls(presentWork(db, db.works.find((work) => work.id === id))))
  }))

  return router
}
