// The data layer: every read and write the site makes goes through these
// functions, so a screen never knows which backend it has.
//
//   VITE_USE_MOCK_API unset or not "false"   a mock database in the browser
//                                            (mock.js, saved in localStorage)
//   VITE_USE_MOCK_API=false                  the Express API (real.js), at
//                                            VITE_API_BASE_URL
//
// Only the chosen backend is downloaded. The mock is the default so a fresh
// copy, and the GitHub Pages demo, work with no server.
//
// Every function is async and fails with an ApiError ({ code, message }).
// `message` is written to be shown to the admin as it is.

export const USE_MOCK = import.meta.env.VITE_USE_MOCK_API !== 'false'

const backend = USE_MOCK ? import('./mock.js') : import('./real.js')
const call = (name) => async (...args) => (await backend)[name](...args)

export { ApiError } from './errors.js'
export { useApi } from './useApi.js'
export { KINDS, STATUSES, SETTING_KEYS, STORAGE_LIMIT_BYTES, publishBlockers, formatBytes, is3dCategory, PASSES, passLabel } from './shared.js'
export { MAX_WIDTH as MAX_IMAGE_WIDTH } from './images.js'

export const listWorks = call('listWorks')
export const getWork = call('getWork')
export const createWork = call('createWork')
export const updateWork = call('updateWork')
export const setWorkStatus = call('setWorkStatus')
export const archiveWork = call('archiveWork')
export const deleteWork = call('deleteWork')
export const setFeaturedWorks = call('setFeaturedWorks')

export const addMediaLink = call('addMediaLink')
export const uploadMedia = call('uploadMedia')
export const listMedia = call('listMedia')
export const getMedia = call('getMedia')
export const updateMedia = call('updateMedia')
export const deleteMedia = call('deleteMedia')

export const listCategories = call('listCategories')
export const createCategory = call('createCategory')
export const updateCategory = call('updateCategory')
export const reorderCategories = call('reorderCategories')
export const deleteCategory = call('deleteCategory')

export const listSiteText = call('listSiteText')
export const updateSiteText = call('updateSiteText')
export const listSocialLinks = call('listSocialLinks')
export const createSocialLink = call('createSocialLink')
export const updateSocialLink = call('updateSocialLink')
export const reorderSocialLinks = call('reorderSocialLinks')
export const deleteSocialLink = call('deleteSocialLink')
export const listExperience = call('listExperience')
export const createExperience = call('createExperience')
export const updateExperience = call('updateExperience')
export const reorderExperience = call('reorderExperience')
export const deleteExperience = call('deleteExperience')
export const getSettings = call('getSettings')
export const updateSettings = call('updateSettings')

export const getDashboard = call('getDashboard')
export const listActivity = call('listActivity')

export const listPublishedWorks = call('listPublishedWorks')
export const getPublishedWork = call('getPublishedWork')
export const listPublicCategories = call('listPublicCategories')
export const getSiteContent = call('getSiteContent')

// Mock only: back to the seed data, uploads included.
export const resetDatabase = call('resetDatabase')
