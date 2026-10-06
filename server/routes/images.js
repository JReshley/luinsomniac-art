import { Router } from 'express'
import { pool } from '../db/pool.js'
import { ApiError, route } from '../errors.js'
import { ART_WIDTHS } from '../mediaFiles.js'
import { watermark } from '../watermark.js'

// GET /api/img/:id?w=800       an artwork picture with the small corner mark
// GET /api/img/:id?download=1  the same picture, full size, with the faint
//                              diagonal tile too, as a file to save
//
// The public API sends these links instead of the Drive or bucket address, so
// a visitor never sees where the unmarked original lives (mediaFiles.js
// protectArtwork). Only a picture a published work shows is served: a draft's
// file is "not found", the same as one that doesn't exist.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// Drive can be slow to answer the first time it scales a file.
const FETCH_TIMEOUT_MS = 15000
const MAX_SOURCE_BYTES = 30 * 1024 * 1024

// The picture, and the slug of a published work that shows it (for the saved
// file's name), or nothing.
async function publishedImage(id) {
  const { rows } = await pool.query(
    `SELECT m.source, m.storage_path_or_url AS path, w.slug
       FROM media m
       JOIN works w ON w.status = 'published'
      WHERE m.id = $1
        AND m.kind = 'image'
        AND (w.cover_media_id = m.id
             OR EXISTS (SELECT 1 FROM work_media l WHERE l.work_id = w.id AND l.media_id = m.id)
             OR EXISTS (SELECT 1 FROM model_details d WHERE d.work_id = w.id AND d.turntable_media_id = m.id))
      LIMIT 1`,
    [id]
  )
  return rows[0] ?? null
}

// Where to download the unmarked original from, at about `width` pixels.
function sourceUrl({ source, path }, width, storage) {
  switch (source) {
    case 'gdrive':
      return `https://drive.google.com/thumbnail?id=${path.match(/\/file\/d\/([^/]+)/)[1]}&sz=w${width}`
    case 'supabase':
      return storage.publicUrl(path)
    default:
      return path
  }
}

async function download(url) {
  const reply = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), redirect: 'follow' })
  if (!reply.ok) throw new Error(`${url} answered ${reply.status}`)
  if (Number(reply.headers.get('content-length')) > MAX_SOURCE_BYTES) throw new Error(`${url} is too big`)
  const bytes = Buffer.from(await reply.arrayBuffer())
  if (bytes.length > MAX_SOURCE_BYTES) throw new Error(`${url} is too big`)
  return bytes
}

export function imageRoutes({ storage }) {
  const router = Router()

  router.get('/:id', route(async (request, response) => {
    const { id } = request.params
    const isDownload = request.query.download === '1'
    // Only the widths the site asks for, so nobody can fill the CDN with a
    // copy per number.
    const width = isDownload ? ART_WIDTHS.at(-1) : Number(request.query.w ?? ART_WIDTHS.at(-1))
    if (!UUID.test(id) || !ART_WIDTHS.includes(width)) throw new ApiError('not_found', 'There’s no picture at this address.')

    const image = await publishedImage(id)
    if (!image) throw new ApiError('not_found', 'There’s no picture at this address.')

    let original
    try {
      original = await download(sourceUrl(image, width, storage))
    } catch (error) {
      console.error('image source failed:', error.message)
      return response.status(502).json({ code: 'source_failed', message: 'That picture couldn’t be loaded. Try again in a moment.' })
    }

    const marked = await watermark(original, { maxWidth: width, variant: isDownload ? 'download' : 'view' })

    // A picture's file doesn't change under the same media row, so the CDN
    // keeps each size for a week and browsers for a day. Unpublishing a work
    // stops new links to it at once; a copy already cached lasts until then.
    response.set('Vercel-CDN-Cache-Control', 'max-age=604800, stale-while-revalidate=86400')
    response.set('Cache-Control', 'public, max-age=86400')
    response.type('image/webp')
    if (isDownload) response.attachment(`${image.slug}-luinsomniac.webp`)
    response.send(marked)
  }))

  return router
}
