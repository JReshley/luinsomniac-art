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
    category: work.category?.name ?? '',
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
  const { cover, model } = work
  return {
    id: work.slug,
    title: work.title,
    year: work.year,
    category: work.category?.name ?? '',
    tags: work.tags,
    description: work.description,
    processNotes: model.processNotes,
    software: model.software,
    polyCount: model.polyCount,
    textured: model.textured,
    externalUrl: model.externalUrl,
    modelUrl: model.file?.url ?? null,
    turntableUrl: model.turntable?.url ?? null,
    posterUrl: cover?.url ?? null,
    alt: cover?.altText || `3D model of ${work.title}`,
    gallery: work.gallery.map((item) => ({
      kind: item.kind,
      url: item.url,
      thumbnailUrl: item.thumbnailUrl,
      alt: item.altText,
      caption: item.caption,
    })),
  }
}
