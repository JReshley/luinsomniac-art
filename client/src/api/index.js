// The data layer: every read and write the site makes goes through these
// functions. For now they run against a mock database in the browser (db.js);
// in phase 6 each becomes a fetch() to the Express route named in its file,
// and nothing that imports from here has to change.
//
// Every function is async and fails with an ApiError ({ code, message }).
// `message` is written to be shown to the admin as it is.

import { resetDatabase as resetTables } from './db.js'
import { clearBlobs } from './blobs.js'

export { ApiError } from './db.js'
export { useApi } from './useApi.js'

export { KINDS, STATUSES, publishBlockers, listWorks, getWork, createWork, updateWork, setWorkStatus, archiveWork } from './works.js'
export { parseMediaLink, addMediaLink, uploadMedia, listMedia, getMedia, updateMedia, deleteMedia, formatBytes } from './media.js'
export { MAX_WIDTH as MAX_IMAGE_WIDTH } from './images.js'
export { listCategories, createCategory, updateCategory, reorderCategories, deleteCategory } from './categories.js'
export {
  listSiteText, updateSiteText,
  listSocialLinks, createSocialLink, updateSocialLink, reorderSocialLinks, deleteSocialLink,
  SETTING_KEYS, getSettings, updateSettings,
} from './content.js'
export { STORAGE_LIMIT_BYTES, getDashboard, listActivity } from './dashboard.js'
export { listPublishedWorks, getPublishedWork, listPublicCategories, getSiteContent } from './public.js'

// Mock only: back to the seed data, uploads included. From the browser
// console: (await import('/src/api/index.js')).resetDatabase()
export async function resetDatabase() {
  await clearBlobs()
  await resetTables()
}
