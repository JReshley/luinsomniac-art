// What the mock and the real API agree on, kept apart from both so that
// importing it doesn't start either one.

export const KINDS = ['artwork', 'model', 'video']
export const STATUSES = ['draft', 'ready', 'published', 'archived']

// The keys Site settings edits. A null value or media means the site uses
// the copy bundled in the repo (the logo in src/assets, and so on), or a
// placeholder where there's nothing bundled (the portrait, the home reel).
export const SETTING_KEYS = ['contact_email', 'display_name', 'logo', 'icon', 'portrait', 'home_reel']
// Settings that point at a file, and the kind of file each takes.
export const FILE_SETTINGS = { logo: 'image', icon: 'image', portrait: 'image', home_reel: 'video' }

// One row of the About page's "Selected experience", tidied in place. Throws
// the first problem as { field, message }; the mock and the server both use it
// (the server has its own copy in server/routes/content.js).
export const EXPERIENCE_FIELDS = ['years', 'role', 'detail']
export function experienceProblem(row) {
  row.years = String(row.years ?? '').trim()
  row.role = String(row.role ?? '').trim()
  row.detail = String(row.detail ?? '').trim()
  if (!row.years) return { field: 'years', message: 'Enter the years, like 2024—2025 or 2025—now.' }
  if (row.years.length > 40) return { field: 'years', message: 'Keep the years under 40 characters.' }
  if (!row.role) return { field: 'role', message: 'Enter the role or what it was, like Freelance 3D artist.' }
  if (row.role.length > 120) return { field: 'role', message: 'Keep the role under 120 characters.' }
  if (row.detail.length > 200) return { field: 'detail', message: 'Keep the detail under 200 characters.' }
  return null
}

// A category about 3D work ("3D", "3D props"…), by its name or slug. Works in
// one are 3D models: saving an artwork into one makes it a 3D model, and the
// 3D Showcase lists them, so a 3D piece can't be left out of it.
export const is3dCategory = (category) => /(^|[^a-z0-9])3d([^a-z0-9]|$)/i.test(`${category?.name ?? ''} ${category?.slug ?? ''}`)

// The render passes a 3D model's gallery images can be labelled with, as in
// the Showcase wireframe's thumbnails. Stored by key; '' means none.
export const PASSES = [
  ['beauty', 'Beauty'],
  ['wireframe', 'Wireframe'],
  ['uv', 'UV / Texture'],
  ['clay', 'Clay'],
  ['other', 'Other'],
]
export const passLabel = (key) => PASSES.find(([value]) => value === key)?.[1] ?? ''

// Supabase's free plan includes 1 GB of file storage.
export const STORAGE_LIMIT_BYTES = 1024 ** 3

// Why a work can't be published yet; empty when it can. The database enforces
// the same rule as a CHECK constraint (server/db/schema.sql), so it holds even
// if a screen or route forgets to ask; this is the readable version.
export function publishBlockers(work) {
  const reasons = []
  if (!work.isOwnWork) reasons.push('It isn’t marked as Lui’s own work. Only own work can be published.')
  if (work.showsRealFace && !work.faceConsent) reasons.push('It shows a real person’s face, and their consent isn’t recorded.')
  return reasons
}

// 32646 -> "32 KB", 1073741824 -> "1 GB".
export function formatBytes(bytes) {
  // parseFloat drops trailing zeros: "1.00" -> 1, "10.50" -> 10.5.
  if (bytes >= 1024 ** 3) return `${parseFloat((bytes / 1024 ** 3).toFixed(2))} GB`
  if (bytes >= 1024 ** 2) return `${parseFloat((bytes / 1024 ** 2).toFixed(1))} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}
