import { passLabel } from '../api/shared.js'

// Turns what the public API sends (api/public.js) into the shapes the public
// pages' components were built around, so the cards, Lightbox and showcase
// don't each pick the API's response apart.

// Pixel size of a file the site knows (uploads), or null (Drive, YouTube).
// Cards use it for their shape; without it an image keeps its own, and a
// placeholder falls back to 4:3.
export const FALLBACK_RATIO = '4 / 3'

export const ratioOf = (item) => (item.width && item.height ? `${item.width} / ${item.height}` : null)

// The 11-character id in a YouTube link, or null.
export function youtubeId(url) {
  if (!url) return null
  try {
    const link = new URL(url)
    return link.hostname.endsWith('youtu.be') ? link.pathname.slice(1) : link.searchParams.get('v')
  } catch {
    return null
  }
}

// The <img> attributes for a picture shown `sizes` wide (the same syntax as
// the attribute, e.g. "(min-width: 64rem) 25vw, 50vw").
//
// A Drive image (mediaFiles.js turns it into Drive's thumbnail link, 2000px
// wide) comes in several widths, so the browser downloads the smallest one
// that's still sharp on that screen: a card on a phone takes the 400 or 800,
// not the 2000. Any other picture (an upload, already shrunk to at most
// 2000px when it went up) has the one size, so it's left as it is.
const DRIVE_WIDTHS = [400, 800, 1200, 2000]

export function imageProps(url, sizes) {
  if (!url) return {}
  let link
  try {
    link = new URL(url)
  } catch {
    return { src: url }
  }
  if (link.hostname !== 'drive.google.com' || !link.pathname.startsWith('/thumbnail')) return { src: url }
  const at = (width) => {
    link.searchParams.set('sz', `w${width}`)
    return link.toString()
  }
  return {
    src: at(800),
    srcSet: DRIVE_WIDTHS.map((width) => `${at(width)} ${width}w`).join(', '),
    sizes,
  }
}

// 184000 -> "184k", 1250000 -> "1.3M". Small counts stay as they are.
export function formatTris(count) {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (count >= 1000) return `${Math.round(count / 1000)}k`
  return String(count)
}

// One work as a grid card and Lightbox use it. `type` is only "image" or
// "video": a 3D model is shown as its cover picture here, and opens as a model
// on the 3D Showcase.
export function toCard(work) {
  const { cover } = work
  return {
    id: work.slug,
    title: work.title,
    year: work.year,
    description: work.description,
    // Every category, for the Museum's filter; shown joined on the card.
    categories: (work.categories ?? (work.category ? [work.category] : [])).map((category) => category.name),
    category: (work.categories ?? (work.category ? [work.category] : [])).map((category) => category.name).join(' · '),
    type: work.kind === 'video' ? 'video' : 'image',
    width: cover?.width ?? null,
    height: cover?.height ?? null,
    imageUrl: cover?.url ?? null,
    alt: cover?.altText ?? '',
    videoUrl: work.video?.file?.url ?? null,
  }
}

// One 3D model as the showcase uses it. The gallery's images and videos come
// along as extra views.
export function toModel(work) {
  const { cover } = work
  // Every 3D model has a details row; this only guards the page if one doesn't.
  const model = work.model ?? { client: '', role: '', software: [], processNotes: '', polyCount: null, textured: false, externalUrl: null, file: null, turntable: null }
  return {
    id: work.slug,
    title: work.title,
    year: work.year,
    category: (work.categories ?? (work.category ? [work.category] : [])).map((category) => category.name).join(' · '),
    tags: work.tags,
    description: work.description,
    processNotes: model.processNotes,
    client: model.client ?? '',
    role: model.role ?? '',
    software: model.software,
    polyCount: model.polyCount,
    textured: model.textured,
    externalUrl: model.externalUrl,
    modelUrl: model.file?.url ?? null,
    // A YouTube video or an animated image; `turntableVideo` says which.
    turntableUrl: model.turntable?.url ?? null,
    turntableThumb: model.turntable?.thumbnailUrl ?? model.turntable?.url ?? null,
    turntableVideo: model.turntable?.source === 'youtube',
    posterUrl: cover?.url ?? null,
    alt: cover?.altText || `3D model of ${work.title}`,
    gallery: work.gallery.map((item) => ({
      kind: item.kind,
      url: item.url,
      thumbnailUrl: item.thumbnailUrl,
      alt: item.altText,
      caption: item.caption,
      pass: passLabel(item.pass),
    })),
  }
}
