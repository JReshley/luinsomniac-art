// The media library: every image, .glb and video the site uses, wherever it's
// stored. Future endpoints:
//   GET    /api/admin/media          listMedia(filters)
//   POST   /api/admin/media/link     addMediaLink(url, fields)
//   POST   /api/admin/media/upload   uploadMedia(file, fields)
//   PATCH  /api/admin/media/:id      updateMedia(id, changes)
//   DELETE /api/admin/media/:id      deleteMedia(id)
//
// `source` says where the file lives:
//   supabase   uploaded to the bucket (the mock keeps it in IndexedDB)
//   gdrive     a Google Drive share link
//   youtube    a YouTube video
//   external   any other https link to an image
//
// Every row the API returns also has `url` (what an <img>, <model-viewer> or
// link uses) and `thumbnailUrl`.

import { ApiError, findRow, logActivity, mutate, newId, query } from './db.js'
import { deleteBlob, getBlob, putBlob } from './blobs.js'
import { compressImage, hashFile } from './images.js'
import { formatBytes } from './shared.js'

// Supabase's free plan caps one file at 50 MB.
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024
const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i

// --- Links ----------------------------------------------------------------

// Works out what a pasted link is. Returns { source, kind, externalId, url }
// or throws an `invalid` ApiError explaining what's accepted.
export function parseMediaLink(input) {
  let url
  try {
    url = new URL(String(input).trim())
  } catch {
    throw new ApiError('invalid', 'That doesn’t look like a link. Copy the whole address, starting with https://', { field: 'url' })
  }
  if (url.protocol !== 'https:') throw new ApiError('invalid', 'Links need to start with https://', { field: 'url' })

  const host = url.hostname.replace(/^(www|m)\./, '')

  if (host === 'youtube.com' || host === 'youtu.be') {
    const id =
      host === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v') ?? url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1]
    if (!/^[\w-]{11}$/.test(id ?? '')) throw new ApiError('invalid', 'That YouTube link doesn’t point to a video. Use the link from Share on the video’s page.', { field: 'url' })
    return { source: 'youtube', kind: 'video', externalId: id, url: `https://www.youtube.com/watch?v=${id}` }
  }

  if (host === 'drive.google.com') {
    const id = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? url.searchParams.get('id')
    if (!id) throw new ApiError('invalid', 'That Drive link doesn’t point to a file. Use Share → Copy link on the file itself, not its folder.', { field: 'url' })
    return { source: 'gdrive', kind: 'image', externalId: id, url: `https://drive.google.com/file/d/${id}/view` }
  }

  if (/\.glb(\?|#|$)/i.test(url.pathname)) {
    throw new ApiError('invalid', 'Upload .glb files instead of linking them. The 3D viewer can’t load most linked models.', { field: 'url' })
  }
  if (IMAGE_EXTENSIONS.test(url.pathname)) return { source: 'external', kind: 'image', externalId: null, url: url.href }

  throw new ApiError('invalid', 'Paste a link to an image file, a Google Drive file or a YouTube video.', { field: 'url' })
}

// fields: { altText }
export async function addMediaLink(input, fields = {}) {
  const link = parseMediaLink(input)
  return mutate((db, ctx) => {
    // The same link twice is the same file.
    const existing = db.media.find((media) => media.storagePathOrUrl === link.url)
    if (existing) return { ...existing, duplicate: true }

    const media = row(ctx, {
      source: link.source,
      kind: link.kind,
      storagePathOrUrl: link.url,
      mime: link.kind === 'video' ? 'video/youtube' : null,
      altText: fields.altText ?? '',
    })
    db.media.push(media)
    logActivity(db, ctx, 'create', 'media', media.id, `Added a ${describeSource(media.source)} link`)
    return media
  }).then(resolveMediaUrls)
}

// --- Uploads --------------------------------------------------------------

// Images are shrunk to WebP first (images.js); .glb files go up as they are.
// A file that was uploaded before comes back as the existing row, with
// `duplicate: true`, instead of being stored twice.
// fields: { altText }
export async function uploadMedia(file, fields = {}) {
  const isModel = /\.glb$/i.test(file.name)
  const isImage = file.type.startsWith('image/') && file.type !== 'image/svg+xml'
  if (!isModel && !isImage) {
    throw new ApiError('invalid', file.type.startsWith('video/')
      ? 'Videos go on YouTube. Upload it there, then paste its link here.'
      : 'Upload an image (PNG, JPEG, WebP or GIF) or a .glb model.', { field: 'file' })
  }

  const sha256 = await hashFile(file)
  const existing = await query((db) => db.media.find((media) => media.sha256 === sha256))
  if (existing) return resolveMediaUrls({ ...existing, duplicate: true })

  const prepared = isImage
    ? await compressImage(file)
    : { blob: file.slice(0, file.size, 'model/gltf-binary'), width: null, height: null }

  if (prepared.blob.size > MAX_UPLOAD_BYTES) {
    throw new ApiError('invalid', `That file is ${formatBytes(prepared.blob.size)}. The limit is 50 MB, so it needs shrinking first.`, { field: 'file' })
  }

  const id = newId()
  const extension = isModel ? 'glb' : prepared.blob.type.split('/')[1]
  await putBlob(id, prepared.blob)

  try {
    return await mutate((db, ctx) => {
      const media = row(ctx, {
        id,
        source: 'supabase',
        kind: isModel ? 'model' : 'image',
        storagePathOrUrl: `${isModel ? 'models' : 'images'}/${id}.${extension}`,
        mime: prepared.blob.type,
        width: prepared.width,
        height: prepared.height,
        bytes: prepared.blob.size,
        sha256,
        altText: fields.altText ?? '',
      })
      db.media.push(media)
      logActivity(db, ctx, 'create', 'media', media.id, `Uploaded ${file.name} (${formatBytes(media.bytes)})`)
      return media
    }).then(resolveMediaUrls)
  } catch (err) {
    await deleteBlob(id)
    throw err
  }
}

// --- Reading, editing, removing -------------------------------------------

// Where a file is used: [{ workId, title, role }] or [{ setting, role }].
function usage(db, id) {
  const uses = []
  const title = (workId) => db.works.find((work) => work.id === workId)?.title
  for (const work of db.works) if (work.coverMediaId === id) uses.push({ workId: work.id, title: work.title, role: 'cover' })
  for (const link of db.workMedia) if (link.mediaId === id) uses.push({ workId: link.workId, title: title(link.workId), role: 'gallery' })
  for (const d of db.modelDetails) {
    if (d.modelMediaId === id) uses.push({ workId: d.workId, title: title(d.workId), role: 'model' })
    if (d.turntableMediaId === id) uses.push({ workId: d.workId, title: title(d.workId), role: 'turntable' })
  }
  for (const d of db.videoDetails) if (d.mediaId === id) uses.push({ workId: d.workId, title: title(d.workId), role: 'video' })
  for (const setting of db.settings) if (setting.mediaId === id) uses.push({ setting: setting.key, role: setting.key })
  return uses
}

// Filters, all optional:
//   kind     'image' | 'model' | 'video'
//   source   'supabase' | 'gdrive' | 'youtube' | 'external'
//   unused   true for only files nothing points at
// Newest first. Each row has `usedBy` (see usage() above).
export async function listMedia({ kind, source, unused } = {}) {
  const media = await query((db) =>
    db.media
      .filter((item) => (!kind || item.kind === kind) && (!source || item.source === source))
      .map((item) => ({ ...item, usedBy: usage(db, item.id) }))
      .filter((item) => !unused || item.usedBy.length === 0)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  )
  return resolveMediaUrls(media)
}

export async function getMedia(id) {
  const media = await query((db) => ({ ...findRow(db.media, id, 'file'), usedBy: usage(db, id) }))
  return resolveMediaUrls(media)
}

// changes: { altText }
export async function updateMedia(id, changes) {
  return mutate((db, ctx) => {
    const media = findRow(db.media, id, 'file')
    if (changes.altText !== undefined) media.altText = String(changes.altText).trim()
    logActivity(db, ctx, 'update', 'media', id, 'Edited a file’s alt text')
    return media
  }).then(resolveMediaUrls)
}

// Only files nothing uses can be removed; the error lists what still does.
export async function deleteMedia(id) {
  await mutate((db, ctx) => {
    findRow(db.media, id, 'file')
    const uses = usage(db, id)
    if (uses.length) {
      const names = uses.map((use) => use.title ?? use.setting)
      throw new ApiError('in_use', `That file is still used by ${[...new Set(names)].join(', ')}. Swap it out there first.`, { usedBy: uses })
    }
    db.media = db.media.filter((media) => media.id !== id)
    logActivity(db, ctx, 'delete', 'media', id, 'Removed an unused file')
  })
  await deleteBlob(id)
}

// --- URLs -----------------------------------------------------------------

// Object URLs for uploaded files, made once per file per page load.
const objectUrls = new Map()

async function urlsFor(media) {
  switch (media.source) {
    case 'youtube': {
      const id = new URL(media.storagePathOrUrl).searchParams.get('v')
      return { url: media.storagePathOrUrl, thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` }
    }
    case 'gdrive': {
      // Drive's view page isn't an image. Its thumbnail endpoint is, and it
      // scales the file down to the size asked for.
      const id = media.storagePathOrUrl.match(/\/file\/d\/([^/]+)/)[1]
      return {
        url: `https://drive.google.com/thumbnail?id=${id}&sz=w2000`,
        thumbnailUrl: `https://drive.google.com/thumbnail?id=${id}&sz=w400`,
      }
    }
    case 'supabase': {
      if (!objectUrls.has(media.id)) {
        const blob = await getBlob(media.id)
        objectUrls.set(media.id, blob ? URL.createObjectURL(blob) : null)
      }
      const url = objectUrls.get(media.id)
      return { url, thumbnailUrl: media.kind === 'image' ? url : null }
    }
    default:
      return { url: media.storagePathOrUrl, thumbnailUrl: media.kind === 'image' ? media.storagePathOrUrl : null }
  }
}

// Adds url and thumbnailUrl to every media row anywhere inside `value` (one
// row, a list, or works with media nested in them). The real API will send
// these already filled in.
export async function resolveMediaUrls(value) {
  const rows = []
  const walk = (node) => {
    if (Array.isArray(node)) node.forEach(walk)
    else if (node && typeof node === 'object') {
      if ('storagePathOrUrl' in node && 'source' in node) rows.push(node)
      Object.values(node).forEach(walk)
    }
  }
  walk(value)
  await Promise.all(rows.map(async (media) => Object.assign(media, await urlsFor(media))))
  return value
}

// --- Helpers --------------------------------------------------------------

function row(ctx, fields) {
  return {
    id: newId(),
    width: null,
    height: null,
    bytes: null,
    sha256: null,
    uploadedBy: ctx.actorId,
    createdAt: ctx.now,
    ...fields,
  }
}

function describeSource(source) {
  return { youtube: 'YouTube', gdrive: 'Google Drive', external: 'web' }[source] ?? source
}
