// Site text, social links and site settings (the Content, Links and Brand
// screens). Future endpoints:
//   GET    /api/admin/site-text            listSiteText()
//   PUT    /api/admin/site-text/:key       updateSiteText(key, value)
//   GET    /api/admin/links                listSocialLinks()
//   POST   /api/admin/links                createSocialLink(fields)
//   PATCH  /api/admin/links/:id            updateSocialLink(id, changes)
//   PUT    /api/admin/links/order          reorderSocialLinks(ids)
//   DELETE /api/admin/links/:id            deleteSocialLink(id)
//   GET    /api/admin/settings             getSettings()
//   PATCH  /api/admin/settings             updateSettings(changes)

import { ApiError, findRow, logActivity, mutate, newId, query } from './db.js'
import { resolveMediaUrls } from './media.js'
import { SETTING_KEYS } from './shared.js'

// --- Site text ------------------------------------------------------------

// Keys name where the text appears, page first: "home.hero.intro".
const KEY_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/

export function listSiteText() {
  return query((db) =>
    [...db.siteText]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((entry) => ({ ...entry, updatedByName: adminName(db, entry.updatedBy) }))
  )
}

// Creates the key if it's new.
export function updateSiteText(key, value) {
  return mutate((db, ctx) => {
    if (!KEY_PATTERN.test(key)) throw new ApiError('invalid', 'Text keys use lowercase words joined by dots, like “home.hero.intro”.', { field: 'key' })
    let entry = db.siteText.find((item) => item.key === key)
    if (!entry) db.siteText.push((entry = { key }))
    Object.assign(entry, { value: String(value ?? ''), updatedAt: ctx.now, updatedBy: ctx.actorId })
    logActivity(db, ctx, 'update', 'site_text', key, `Edited the text “${key}”`)
    return entry
  })
}

// --- Social links ---------------------------------------------------------

const LINK_FIELDS = ['platform', 'handle', 'url', 'visible']

export function listSocialLinks() {
  return query((db) => [...db.socialLinks].sort((a, b) => a.sortOrder - b.sortOrder))
}

export function createSocialLink(fields) {
  return mutate((db, ctx) => {
    const link = { id: newId(), platform: '', handle: '', url: '', visible: true, sortOrder: Math.max(-1, ...db.socialLinks.map((l) => l.sortOrder)) + 1 }
    validateLink(Object.assign(link, pick(fields, LINK_FIELDS)))
    db.socialLinks.push(link)
    logActivity(db, ctx, 'create', 'social_link', link.id, `Added the ${link.platform} link`)
    return link
  })
}

export function updateSocialLink(id, changes) {
  return mutate((db, ctx) => {
    const link = findRow(db.socialLinks, id, 'link')
    validateLink(Object.assign(link, pick(changes, LINK_FIELDS)))
    logActivity(db, ctx, 'update', 'social_link', id, `Edited the ${link.platform} link`)
    return link
  })
}

export function reorderSocialLinks(ids) {
  return mutate((db, ctx) => {
    if (ids.length !== db.socialLinks.length || !db.socialLinks.every((link) => ids.includes(link.id))) {
      throw new ApiError('invalid', 'The links changed while you were sorting them. Reload and try again.')
    }
    ids.forEach((id, i) => (findRow(db.socialLinks, id, 'link').sortOrder = i))
    logActivity(db, ctx, 'reorder', 'social_link', null, 'Reordered the social links')
  })
}

// A link is only an address, so it's really removed. Hide it (visible: false)
// to take it off the site but keep it.
export function deleteSocialLink(id) {
  return mutate((db, ctx) => {
    const link = findRow(db.socialLinks, id, 'link')
    db.socialLinks = db.socialLinks.filter((item) => item.id !== id)
    logActivity(db, ctx, 'delete', 'social_link', id, `Removed the ${link.platform} link`)
  })
}

function validateLink(link) {
  link.platform = String(link.platform).trim().toLowerCase()
  link.handle = String(link.handle ?? '').trim()
  link.url = String(link.url).trim()
  link.visible = Boolean(link.visible)
  if (!link.platform) throw new ApiError('invalid', 'Say which site the link is for, like “instagram”.', { field: 'platform' })
  if (!/^https:\/\/\S+$/.test(link.url)) throw new ApiError('invalid', 'Links need to start with https://', { field: 'url' })
}

// --- Settings -------------------------------------------------------------

const IMAGE_SETTINGS = ['logo', 'icon', 'portrait']

// { contact_email: { value, mediaId, media }, ... }
export async function getSettings() {
  const settings = await query((db) =>
    Object.fromEntries(
      db.settings.map((setting) => [setting.key, { ...setting, media: db.media.find((media) => media.id === setting.mediaId) ?? null }])
    )
  )
  return resolveMediaUrls(settings)
}

// changes: { contact_email: { value }, logo: { mediaId }, ... }
export function updateSettings(changes) {
  return mutate((db, ctx) => {
    for (const [key, change] of Object.entries(changes)) {
      if (!SETTING_KEYS.includes(key)) throw new ApiError('invalid', `There’s no setting called “${key}”.`, { field: key })
      const setting = db.settings.find((item) => item.key === key)

      if (change.value !== undefined) setting.value = change.value === null ? null : String(change.value).trim()
      if (change.mediaId !== undefined) {
        const media = change.mediaId && findRow(db.media, change.mediaId, 'file')
        if (media && (!IMAGE_SETTINGS.includes(key) || media.kind !== 'image')) {
          throw new ApiError('invalid', 'Pick an image for the logo, icon or portrait.', { field: key })
        }
        setting.mediaId = change.mediaId || null
      }

      if (key === 'contact_email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(setting.value ?? '')) {
        throw new ApiError('invalid', 'Enter the contact email as name@example.com.', { field: key })
      }
      if (key === 'display_name' && !setting.value) throw new ApiError('invalid', 'The display name can’t be blank.', { field: key })
    }
    logActivity(db, ctx, 'update', 'settings', null, `Edited ${Object.keys(changes).map((key) => key.replace('_', ' ')).join(', ')}`)
  })
}

// --- Helpers --------------------------------------------------------------

function pick(source, fields) {
  return Object.fromEntries(fields.filter((field) => source[field] !== undefined).map((field) => [field, source[field]]))
}

function adminName(db, userId) {
  return db.admins.find((admin) => admin.userId === userId)?.displayName ?? null
}
