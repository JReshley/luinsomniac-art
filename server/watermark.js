import { readFileSync } from 'node:fs'
import sharp from 'sharp'

// Stamps Lui's mark (assets/watermark.png: the logo and @luinsomniac_art,
// white with a dark edge so it reads on light and dark art) onto an artwork.
//
//   'view'      a small mark in the bottom-right corner, for the site
//   'download'  the corner mark plus a faint diagonal tile across the whole
//               picture, for the file the "Save image" menu hands out
//
// The mark is drawn into the pixels, so it can't be peeled off with devtools
// the way a CSS overlay can. It doesn't stop a screenshot; nothing does.

const MARK = readFileSync(new URL('./assets/watermark.png', import.meta.url))

const CORNER_OPACITY = 0.45
const CORNER_WIDTH = 0.22 // of the picture's width
const CORNER_MIN_WIDTH = 90
const CORNER_MAX_WIDTH = 420
const CORNER_MARGIN = 0.025

const TILE_OPACITY = 0.13
const TILE_WIDTH = 0.3
const TILE_ANGLE = -30
const TILE_GAP = 0.5 // of the rotated mark's size, on every side

const QUALITY = 82

// The mark at `width` pixels wide, with every pixel's alpha scaled by
// `opacity`: 'dest-in' keeps the mark where a flat, part-transparent layer
// covers it, multiplying the two alphas.
async function markAt(width, opacity) {
  const resized = await sharp(MARK).resize({ width: Math.max(1, Math.round(width)) }).png().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = resized.info
  return sharp(resized.data)
    .composite([{ input: { create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: opacity } } }, blend: 'dest-in' }])
    .png()
    .toBuffer()
}

async function tileFor(pictureWidth) {
  const faint = await markAt(pictureWidth * TILE_WIDTH, TILE_OPACITY)
  const rotated = await sharp(faint)
    .rotate(TILE_ANGLE, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer({ resolveWithObject: true })
  const padX = Math.round((rotated.info.width * TILE_GAP) / 2)
  const padY = Math.round((rotated.info.height * TILE_GAP) / 2)
  return sharp(rotated.data)
    .extend({ top: padY, bottom: padY, left: padX, right: padX, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
}

// `source` is the original file's bytes; `maxWidth` the widest the result may
// be (it's never enlarged). Resolves with a WebP buffer.
export async function watermark(source, { maxWidth, variant }) {
  // An animated turntable (GIF or WebP) keeps its frames: sharp stacks them
  // into one tall picture, so the overlays go on each frame's own height.
  const resized = await sharp(source, { animated: true })
    .rotate() // honour the camera's orientation before measuring
    .resize({ width: maxWidth, withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true })

  const input = sharp(resized.data, { animated: true })
  const { width, pageHeight, pages = 1 } = await input.metadata()
  const frameHeight = pageHeight ?? resized.info.height

  const cornerWidth = Math.min(CORNER_MAX_WIDTH, Math.max(CORNER_MIN_WIDTH, width * CORNER_WIDTH), width * 0.6)
  const corner = await markAt(cornerWidth, CORNER_OPACITY)
  const { height: cornerHeight, width: cornerActualWidth } = await sharp(corner).metadata()
  const margin = Math.round(width * CORNER_MARGIN)

  // The tile pattern on a layer the size of one frame, so it lines up on every frame.
  const tiled =
    variant === 'download'
      ? await sharp({ create: { width, height: frameHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
          .composite([{ input: await tileFor(width), tile: true, top: 0, left: 0 }])
          .png()
          .toBuffer()
      : null

  const layers = []
  for (let frame = 0; frame < pages; frame++) {
    const top = frame * frameHeight
    if (tiled) layers.push({ input: tiled, top, left: 0 })
    layers.push({
      input: corner,
      top: Math.max(0, top + frameHeight - cornerHeight - margin),
      left: Math.max(0, width - cornerActualWidth - margin),
    })
  }

  return input.composite(layers).webp({ quality: QUALITY }).toBuffer()
}
