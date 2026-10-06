// What the media routes and the work routes share: reading a pasted link,
// building the URLs a file is shown from, and finding where a file is used.
// Ported from the mock (client/src/api/media.js), which stays the reference for
// what each rule is for.

import { ApiError } from './errors.js'

const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i

// Works out what a pasted link is: { source, kind, url }, or throws an
// `invalid` error saying what's accepted.
export function parseMediaLink(input) {
  let url
  try {
    url = new URL(String(input ?? '').trim())
  } catch {
    throw new ApiError('invalid', 'That doesn’t look like a link. Copy the whole address, starting with https://', { field: 'url' })
  }
  if (url.protocol !== 'https:') throw new ApiError('invalid', 'Links need to start with https://', { field: 'url' })

  const host = url.hostname.replace(/^(www|m)\./, '')

  if (host === 'youtube.com' || host === 'youtu.be') {
    const id =
      host === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v') ?? url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1]
    if (!/^[\w-]{11}$/.test(id ?? '')) {
      throw new ApiError('invalid', 'That YouTube link doesn’t point to a video. Use the link from Share on the video’s page.', { field: 'url' })
    }
    return { source: 'youtube', kind: 'video', url: `https://www.youtube.com/watch?v=${id}` }
  }

  if (host === 'drive.google.com') {
    const id = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? url.searchParams.get('id')
    if (!id) throw new ApiError('invalid', 'That Drive link doesn’t point to a file. Use Share → Copy link on the file itself, not its folder.', { field: 'url' })
    return { source: 'gdrive', kind: 'image', url: `https://drive.google.com/file/d/${id}/view` }
  }

  if (/\.glb(\?|#|$)/i.test(url.pathname)) {
    throw new ApiError('invalid', 'Upload .glb files instead of linking them. The 3D viewer can’t load most linked models.', { field: 'url' })
  }
  if (IMAGE_EXTENSIONS.test(url.pathname)) return { source: 'external', kind: 'image', url: url.href }

  throw new ApiError('invalid', 'Paste a link to an image file, a Google Drive file or a YouTube video.', { field: 'url' })
}

// url is what an <img>, <model-viewer> or link uses; thumbnailUrl a small
// version, or null when there isn't one.
function urlsFor(media, storage) {
  switch (media.source) {
    case 'youtube': {
      const id = new URL(media.storagePathOrUrl).searchParams.get('v')
      return { url: media.storagePathOrUrl, thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` }
    }
    case 'gdrive': {
      // Drive's view page isn't an image. Its thumbnail endpoint is, and it
      // scales the file to the size asked for.
      const id = media.storagePathOrUrl.match(/\/file\/d\/([^/]+)/)[1]
      return {
        url: `https://drive.google.com/thumbnail?id=${id}&sz=w2000`,
        thumbnailUrl: `https://drive.google.com/thumbnail?id=${id}&sz=w400`,
      }
    }
    case 'supabase': {
      const url = storage.publicUrl(media.storagePathOrUrl)
      return { url, thumbnailUrl: media.kind === 'image' ? url : null }
    }
    default:
      return { url: media.storagePathOrUrl, thumbnailUrl: media.kind === 'image' ? media.storagePathOrUrl : null }
  }
}

// Adds url and thumbnailUrl to every media row anywhere inside `value` (one
// row, a list, or works with media nested in them), like the mock does.
export function resolveMediaUrls(value, storage) {
  const walk = (node) => {
    if (Array.isArray(node)) node.forEach(walk)
    else if (node && typeof node === 'object') {
      if ('storagePathOrUrl' in node && 'source' in node) Object.assign(node, urlsFor(node, storage))
      Object.values(node).forEach(walk)
    }
  }
  walk(value)
  return value
}

// The widths /api/img serves an artwork at (routes/images.js), smallest
// first. The client's imageProps() builds its srcset from the same list.
export const ART_WIDTHS = [400, 800, 1200, 2000]

// For the public site: every artwork picture inside `value` is shown from
// /api/img (watermarked) instead of its Drive or bucket address, and that
// address is taken out of the reply so a visitor can't fetch the unmarked
// original. YouTube videos and .glb models are left as they are. Call after
// resolveMediaUrls.
export function protectArtwork(value) {
  const walk = (node) => {
    if (Array.isArray(node)) node.forEach(walk)
    else if (node && typeof node === 'object') {
      if ('storagePathOrUrl' in node && 'source' in node) {
        if (node.kind === 'image' && node.source !== 'youtube') {
          node.url = `/api/img/${node.id}?w=${ART_WIDTHS.at(-1)}`
          node.thumbnailUrl = `/api/img/${node.id}?w=${ART_WIDTHS[0]}`
        }
        delete node.storagePathOrUrl
      }
      Object.values(node).forEach(walk)
    }
  }
  walk(value)
  return value
}

// Where a file is used: [{ workId, title, role }] or [{ setting, role }].
export function usage(db, id) {
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

export function formatBytes(bytes) {
  if (bytes >= 1024 ** 3) return `${parseFloat((bytes / 1024 ** 3).toFixed(2))} GB`
  if (bytes >= 1024 ** 2) return `${parseFloat((bytes / 1024 ** 2).toFixed(1))} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}
