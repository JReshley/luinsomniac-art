// The real API: each function is a request to the Express route named in the
// matching mock file (works.js, media.js …), and returns the same shape, so
// nothing that imports from api/index.js changes between the two.

import { ApiError } from './errors.js'
import { compressImage, hashFile } from './images.js'
import { request } from './http.js'

const enc = encodeURIComponent

// --- Works ------------------------------------------------------------------

export const listWorks = (filters = {}) => request('GET', '/api/admin/works', { query: filters })
export const getWork = (id) => request('GET', `/api/admin/works/${enc(id)}`)
export const createWork = (input) => request('POST', '/api/admin/works', { body: input })
export const updateWork = (id, changes) => request('PATCH', `/api/admin/works/${enc(id)}`, { body: changes })
export const setWorkStatus = (id, status) => updateWork(id, { status })
// What the admin calls "Delete".
export const archiveWork = (id) => setWorkStatus(id, 'archived')
// The home page's featured works, in order (up to 9, published only).
export const setFeaturedWorks = (ids) => request('PUT', '/api/admin/works/featured', { body: { ids } })

// --- Media ------------------------------------------------------------------

export const listMedia = (filters = {}) => request('GET', '/api/admin/media', { query: filters })
export const getMedia = (id) => request('GET', `/api/admin/media/${enc(id)}`)
export const updateMedia = (id, changes) => request('PATCH', `/api/admin/media/${enc(id)}`, { body: changes })
export const deleteMedia = (id) => request('DELETE', `/api/admin/media/${enc(id)}`)
export const addMediaLink = (url, fields = {}) => request('POST', '/api/admin/media/link', { body: { url, altText: fields.altText } })

// An upload goes in three steps, so the file never passes through the API:
//   1. ask the server for permission (it also says if the file is already here)
//   2. send the file straight to the Supabase bucket with the one-use token
//   3. tell the server it arrived, and it records the file
// Images are shrunk to WebP in the browser first (images.js).
export async function uploadMedia(file, fields = {}) {
  const isModel = /\.glb$/i.test(file.name)
  const isImage = file.type.startsWith('image/') && file.type !== 'image/svg+xml'
  if (!isModel && !isImage) {
    throw new ApiError('invalid', file.type.startsWith('video/')
      ? 'Videos go on YouTube. Upload it there, then paste its link here.'
      : 'Upload an image (PNG, JPEG, WebP or GIF) or a .glb model.', { field: 'file' })
  }

  // The hash is of the file as chosen, so choosing the same file again is
  // recognised even though what's stored is the shrunken copy.
  const sha256 = await hashFile(file)
  const prepared = isImage
    ? await compressImage(file)
    : { blob: file.slice(0, file.size, 'model/gltf-binary'), width: null, height: null }
  const mime = isImage ? prepared.blob.type : 'model/gltf-binary'

  const ticket = await request('POST', '/api/admin/media/upload-url', {
    body: { filename: file.name, mime: isImage ? mime : '', bytes: prepared.blob.size, sha256 },
  })
  if (ticket.duplicate) return ticket.duplicate

  const { getSupabase } = await import('../lib/supabase.js')
  const { error } = await getSupabase().storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, prepared.blob, { contentType: mime })
  if (error) throw new ApiError('invalid', 'The upload didn’t go through. Check your connection and try again.', { field: 'file' })

  return request('POST', '/api/admin/media/upload-complete', {
    body: { path: ticket.path, mime, width: prepared.width, height: prepared.height, bytes: prepared.blob.size, sha256, altText: fields.altText },
  })
}

// --- Categories -------------------------------------------------------------

export const listCategories = () => request('GET', '/api/admin/categories')
export const createCategory = ({ name }) => request('POST', '/api/admin/categories', { body: { name } })
export const updateCategory = (id, changes) => request('PATCH', `/api/admin/categories/${enc(id)}`, { body: changes })
export const reorderCategories = (ids) => request('PUT', '/api/admin/categories/order', { body: { ids } })
export const deleteCategory = (id) => request('DELETE', `/api/admin/categories/${enc(id)}`)

// --- Site text, links and settings ------------------------------------------

export const listSiteText = () => request('GET', '/api/admin/site-text')
export const updateSiteText = (key, value) => request('PUT', `/api/admin/site-text/${enc(key)}`, { body: { value } })

export const listSocialLinks = () => request('GET', '/api/admin/links')
export const createSocialLink = (fields) => request('POST', '/api/admin/links', { body: fields })
export const updateSocialLink = (id, changes) => request('PATCH', `/api/admin/links/${enc(id)}`, { body: changes })
export const reorderSocialLinks = (ids) => request('PUT', '/api/admin/links/order', { body: { ids } })
export const deleteSocialLink = (id) => request('DELETE', `/api/admin/links/${enc(id)}`)

export const listExperience = () => request('GET', '/api/admin/experience')
export const createExperience = (fields) => request('POST', '/api/admin/experience', { body: fields })
export const updateExperience = (id, changes) => request('PATCH', `/api/admin/experience/${enc(id)}`, { body: changes })
export const reorderExperience = (ids) => request('PUT', '/api/admin/experience/order', { body: { ids } })
export const deleteExperience = (id) => request('DELETE', `/api/admin/experience/${enc(id)}`)

export const getSettings = () => request('GET', '/api/admin/settings')
export const updateSettings = (changes) => request('PATCH', '/api/admin/settings', { body: changes })

// --- Dashboard --------------------------------------------------------------

export const getDashboard = () => request('GET', '/api/admin/dashboard')
export const listActivity = (filters = {}) => request('GET', '/api/admin/activity', { query: filters })

// --- Public (no sign-in) ----------------------------------------------------

export const listPublishedWorks = (filters = {}) => request('GET', '/api/works', { query: filters })
export const getPublishedWork = (slug) => request('GET', `/api/works/${enc(slug)}`)
export const listPublicCategories = () => request('GET', '/api/categories')
export const getSiteContent = () => request('GET', '/api/site')
