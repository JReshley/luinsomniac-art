// The browser mock, as one module, so index.js can load it only when the mock
// is the backend. Same function names as real.js.

import { resetDatabase as resetTables } from './db.js'
import { clearBlobs } from './blobs.js'

export { listWorks, getWork, createWork, updateWork, setWorkStatus, archiveWork } from './works.js'
export { addMediaLink, uploadMedia, listMedia, getMedia, updateMedia, deleteMedia } from './media.js'
export { listCategories, createCategory, updateCategory, reorderCategories, deleteCategory } from './categories.js'
export {
  listSiteText, updateSiteText,
  listSocialLinks, createSocialLink, updateSocialLink, reorderSocialLinks, deleteSocialLink,
  listExperience, createExperience, updateExperience, reorderExperience, deleteExperience,
  getSettings, updateSettings,
} from './content.js'
export { getDashboard, listActivity } from './dashboard.js'
export { listPublishedWorks, getPublishedWork, listPublicCategories, getSiteContent } from './public.js'

// Back to the seed data, uploads included. From the browser console:
// (await import('/src/api/index.js')).resetDatabase()
export async function resetDatabase() {
  await clearBlobs()
  await resetTables()
}
