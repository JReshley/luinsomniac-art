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
