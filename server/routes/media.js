import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { pool, transaction } from '../db/pool.js'
import { logActivity } from '../activity.js'
import { ApiError, route } from '../errors.js'
import { formatBytes, parseMediaLink, resolveMediaUrls, usage } from '../mediaFiles.js'
import { camel, loadDb } from '../rows.js'

// The media library. Uploads don't pass through this server: it hands the
// browser a one-use upload link (upload-url), the browser sends the file
// straight to the bucket, then tells us it's there (upload-complete) and the
// row is recorded. That keeps big files off the API host.

// Supabase's free plan caps one file at 50 MB.
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024
const IMAGE_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' }

const USAGE_TABLES = ['media', 'works', 'workMedia', 'modelDetails', 'videoDetails', 'settings']

export function mediaRoutes({ storage }) {
  const router = Router()
  const withUrls = (value) => resolveMediaUrls(value, storage)

  router.get('/', route(async (request, response) => {
    const { kind, source, unused } = request.query
    const db = await loadDb(pool, USAGE_TABLES)
    const media = db.media
      .filter((item) => (!kind || item.kind === kind) && (!source || item.source === source))
      .map((item) => ({ ...item, usedBy: usage(db, item.id) }))
      .filter((item) => unused !== 'true' || item.usedBy.length === 0)
      .sort((a, b) => b.createdAt - a.createdAt)
    response.json(withUrls(media))
  }))

  router.get('/:id', route(async (request, response) => {
    const db = await loadDb(pool, USAGE_TABLES)
    const media = db.media.find((item) => item.id === request.params.id)
    if (!media) throw notFound()
    response.json(withUrls({ ...media, usedBy: usage(db, media.id) }))
  }))

  // Paste a Drive, YouTube or image link.
  router.post('/link', route(async (request, response) => {
    const link = parseMediaLink(request.body?.url)
    const altText = String(request.body?.altText ?? '').trim()

    const result = await transaction(async (client) => {
      // The same link twice is the same file.
      const existing = await client.query('SELECT * FROM media WHERE storage_path_or_url = $1', [link.url])
      if (existing.rows.length) return { ...camel(existing.rows[0]), duplicate: true }

      const { rows } = await client.query(
        `INSERT INTO media (source, kind, storage_path_or_url, mime, alt_text, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [link.source, link.kind, link.url, link.kind === 'video' ? 'video/youtube' : null, altText, request.admin.id]
      )
      const media = camel(rows[0])
      await logActivity(client, request.admin.id, 'create', 'media', media.id, `Added a ${describeSource(media.source)} link`)
      return media
    })
    response.status(result.duplicate ? 200 : 201).json(withUrls(result))
  }))

  // Step 1 of an upload: check the file, and either say it's already here or
  // give the browser somewhere to send it.
  router.post('/upload-url', route(async (request, response) => {
    const { filename, mime, bytes, sha256 } = request.body ?? {}
    const isModel = /\.glb$/i.test(String(filename ?? ''))
    if (!isModel && !IMAGE_TYPES[mime]) {
      throw new ApiError('invalid', 'Upload an image (PNG, JPEG, WebP or GIF) or a .glb model.', { field: 'file' })
    }
    if (!/^[0-9a-f]{64}$/.test(String(sha256 ?? ''))) throw new ApiError('invalid', 'The file couldn’t be checked. Try again.', { field: 'file' })
    if (!Number.isInteger(bytes) || bytes <= 0) throw new ApiError('invalid', 'That file looks empty.', { field: 'file' })
    if (bytes > MAX_UPLOAD_BYTES) {
      throw new ApiError('invalid', `That file is ${formatBytes(bytes)}. The limit is 50 MB, so it needs shrinking first.`, { field: 'file' })
    }

    const existing = await pool.query('SELECT * FROM media WHERE sha256 = $1', [sha256])
    if (existing.rows.length) return response.json({ duplicate: withUrls({ ...camel(existing.rows[0]), duplicate: true }) })

    const id = randomUUID()
    const path = `${isModel ? 'models' : 'images'}/${id}.${isModel ? 'glb' : IMAGE_TYPES[mime]}`
    const upload = await storage.signedUpload(path)
    response.json({ bucket: storage.bucket, path: upload.path, token: upload.token })
  }))

  // Step 2: the browser says the file is in the bucket. Check it really is,
  // then record it.
  router.post('/upload-complete', route(async (request, response) => {
    const { path, mime, width, height, bytes, sha256 } = request.body ?? {}
    const match = String(path ?? '').match(/^(images|models)\/([0-9a-f-]{36})\.[a-z0-9]+$/)
    if (!match) throw new ApiError('invalid', 'That upload doesn’t look right. Try again.', { field: 'file' })
    if (!(await storage.exists(path))) throw new ApiError('invalid', 'The file never arrived. Try uploading it again.', { field: 'file' })

    const isModel = match[1] === 'models'
    let media
    try {
      media = await transaction(async (client) => {
        const { rows } = await client.query(
          `INSERT INTO media (id, source, kind, storage_path_or_url, mime, width, height, bytes, sha256, alt_text, uploaded_by)
           VALUES ($1, 'supabase', $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
          [
            match[2],
            isModel ? 'model' : 'image',
            path,
            isModel ? 'model/gltf-binary' : mime,
            width ?? null,
            height ?? null,
            bytes,
            sha256,
            String(request.body?.altText ?? '').trim(),
            request.admin.id,
          ]
        )
        const row = camel(rows[0])
        await logActivity(client, request.admin.id, 'create', 'media', row.id, `Uploaded ${isModel ? 'a 3D model' : 'an image'} (${formatBytes(bytes)})`)
        return row
      })
    } catch (error) {
      // Don't leave a file in the bucket that no row points at.
      await storage.remove(path).catch(() => {})
      throw error
    }
    response.status(201).json(withUrls(media))
  }))

  router.patch('/:id', route(async (request, response) => {
    const media = await transaction(async (client) => {
      const { rows } = await client.query('SELECT id FROM media WHERE id = $1', [request.params.id])
      if (!rows.length) throw notFound()
      if (request.body?.altText !== undefined) {
        await client.query('UPDATE media SET alt_text = $1 WHERE id = $2', [String(request.body.altText).trim(), request.params.id])
      }
      await logActivity(client, request.admin.id, 'update', 'media', request.params.id, 'Edited a file’s alt text')
      return camel((await client.query('SELECT * FROM media WHERE id = $1', [request.params.id])).rows[0])
    })
    response.json(withUrls(media))
  }))

  // Only files nothing uses can be removed; the error lists what still does.
  router.delete('/:id', route(async (request, response) => {
    let removedPath = null
    await transaction(async (client) => {
      const db = await loadDb(client, USAGE_TABLES)
      const media = db.media.find((item) => item.id === request.params.id)
      if (!media) throw notFound()
      const uses = usage(db, media.id)
      if (uses.length) {
        const names = [...new Set(uses.map((use) => use.title ?? use.setting))]
        throw new ApiError('in_use', `That file is still used by ${names.join(', ')}. Swap it out there first.`, { usedBy: uses })
      }
      await client.query('DELETE FROM media WHERE id = $1', [media.id])
      await logActivity(client, request.admin.id, 'delete', 'media', media.id, 'Removed an unused file')
      if (media.source === 'supabase') removedPath = media.storagePathOrUrl
    })
    // After the row is gone: a failed file removal leaves an orphan, which is
    // better than a row pointing at a missing file.
    if (removedPath) await storage.remove(removedPath).catch((error) => console.error('Could not remove', removedPath, error.message))
    response.status(204).end()
  }))

  return router
}

const notFound = () => new ApiError('not_found', 'That file doesn’t exist. It may have been removed in another tab.')
const describeSource = (source) => ({ youtube: 'YouTube', gdrive: 'Google Drive', external: 'web' }[source] ?? source)
