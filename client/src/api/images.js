// Shrinking and fingerprinting files in the browser before they're uploaded,
// to keep the Supabase bucket small (admin plan: storage savings). Unlike the
// rest of src/api/ this stays as it is in phase 6; only where the result is
// sent changes.

export const MAX_WIDTH = 2000
const QUALITY = 0.85

// Re-encodes an image as WebP, at most MAX_WIDTH pixels wide. Resolves with
// { blob, width, height }.
//
// GIFs are passed through untouched, because the canvas only keeps the first
// frame. If re-encoding a WebP that's already small enough would make it
// bigger, the original is kept.
export async function compressImage(file) {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('That file isn’t an image this browser can read. Try a PNG, JPEG or WebP.')
  })
  const { width, height } = bitmap

  if (file.type === 'image/gif') {
    bitmap.close()
    return { blob: file, width, height }
  }

  const scale = Math.min(1, MAX_WIDTH / width)
  const outWidth = Math.round(width * scale)
  const outHeight = Math.round(height * scale)

  const canvas = new OffscreenCanvas(outWidth, outHeight)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, outWidth, outHeight)
  bitmap.close()
  const blob = await canvas.convertToBlob({ type: 'image/webp', quality: QUALITY })

  if (file.type === 'image/webp' && scale === 1 && blob.size >= file.size) {
    return { blob: file, width, height }
  }
  return { blob, width: outWidth, height: outHeight }
}

// The file's SHA-256 as hex. Two uploads of the same file get the same hash,
// so the second can reuse the first instead of being stored twice.
export async function hashFile(file) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
