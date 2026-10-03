import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { pool, transaction } from '../db/pool.js'
import { logActivity } from '../activity.js'
import { ApiError, route } from '../errors.js'
import { resolveMediaUrls } from '../mediaFiles.js'
import { loadDb, pick } from '../rows.js'

// Site text, social links and site settings: the Site text, Links and Brand
// screens.

// Keys name where the text appears, page first: "home.hero.intro".
const KEY_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/
const LINK_FIELDS = ['platform', 'handle', 'url', 'visible']

// The keys the Brand and Links screens edit. A null value or media means the
// site uses the copy bundled in the repo (the logo in src/assets, and so on).
export const SETTING_KEYS = ['contact_email', 'display_name', 'logo', 'icon', 'portrait', 'home_reel']
// Settings that point at a file, and the kind of file each takes.
const FILE_SETTINGS = { logo: 'image', icon: 'image', portrait: 'image', home_reel: 'video' }

// How each setting reads in the activity log.
const SETTING_NAMES = {
  contact_email: 'the contact email',
  display_name: 'the artist name',
  logo: 'the logo',
  icon: 'the browser tab icon',
  portrait: 'the portrait',
  home_reel: 'the prop samples video',
}
const settingNames = (keys) => keys.map((key) => SETTING_NAMES[key] ?? key).join(', ')

export function contentRoutes({ storage }) {
  const router = Router()
  const adminName = (db, userId) => db.admins.find((admin) => admin.userId === userId)?.displayName ?? null

  // --- Site text ----------------------------------------------------------

  router.get('/site-text', route(async (request, response) => {
    const db = await loadDb(pool, ['siteText', 'admins'])
    response.json(db.siteText.sort((a, b) => a.key.localeCompare(b.key)).map((entry) => ({ ...entry, updatedByName: adminName(db, entry.updatedBy) })))
  }))

  // Creates the key if it's new. body: { value }
  router.put('/site-text/:key', route(async (request, response) => {
    const { key } = request.params
    if (!KEY_PATTERN.test(key)) throw new ApiError('invalid', 'Text keys use lowercase words joined by dots, like “home.hero.intro”.', { field: 'key' })
    const entry = await transaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO site_text (key, value, updated_by) VALUES ($1, $2, $3)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by
         RETURNING key, value, updated_at, updated_by`,
        [key, String(request.body?.value ?? ''), request.admin.id]
      )
      await logActivity(client, request.admin.id, 'update', 'site_text', key, `Edited the text “${key}”`)
      return { key: rows[0].key, value: rows[0].value, updatedAt: rows[0].updated_at, updatedBy: rows[0].updated_by }
    })
    response.json(entry)
  }))

  // --- Social links -------------------------------------------------------

  router.get('/links', route(async (request, response) => {
    const { socialLinks } = await loadDb(pool, ['socialLinks'])
    response.json(socialLinks.sort((a, b) => a.sortOrder - b.sortOrder))
  }))

  router.post('/links', route(async (request, response) => {
    const link = await transaction(async (client) => {
      const { socialLinks } = await loadDb(client, ['socialLinks'])
      const row = { id: randomUUID(), platform: '', handle: '', url: '', visible: true, sortOrder: Math.max(-1, ...socialLinks.map((l) => l.sortOrder)) + 1 }
      validateLink(Object.assign(row, pick(request.body, LINK_FIELDS)))
      await client.query(
        'INSERT INTO social_links (id, platform, handle, url, visible, sort_order) VALUES ($1, $2, $3, $4, $5, $6)',
        [row.id, row.platform, row.handle, row.url, row.visible, row.sortOrder]
      )
      await logActivity(client, request.admin.id, 'create', 'social_link', row.id, `Added the ${row.platform} link`)
      return row
    })
    response.status(201).json(link)
  }))

  // Registered before /links/:id so "order" isn't read as an id.
  router.put('/links/order', route(async (request, response) => {
    const ids = request.body?.ids
    await transaction(async (client) => {
      const { socialLinks } = await loadDb(client, ['socialLinks'])
      if (!Array.isArray(ids) || ids.length !== socialLinks.length || !socialLinks.every((link) => ids.includes(link.id))) {
        throw new ApiError('invalid', 'The links changed while you were sorting them. Reload and try again.')
      }
      for (const [i, id] of ids.entries()) await client.query('UPDATE social_links SET sort_order = $1 WHERE id = $2', [i, id])
      await logActivity(client, request.admin.id, 'reorder', 'social_link', null, 'Reordered the social links')
    })
    response.status(204).end()
  }))

  router.patch('/links/:id', route(async (request, response) => {
    const link = await transaction(async (client) => {
      const { socialLinks } = await loadDb(client, ['socialLinks'])
      const row = socialLinks.find((item) => item.id === request.params.id)
      if (!row) throw linkNotFound()
      validateLink(Object.assign(row, pick(request.body, LINK_FIELDS)))
      await client.query('UPDATE social_links SET platform = $1, handle = $2, url = $3, visible = $4 WHERE id = $5', [row.platform, row.handle, row.url, row.visible, row.id])
      await logActivity(client, request.admin.id, 'update', 'social_link', row.id, `Edited the ${row.platform} link`)
      return row
    })
    response.json(link)
  }))

  // A link is only an address, so it's really removed. Hide it (visible:
  // false) to take it off the site but keep it.
  router.delete('/links/:id', route(async (request, response) => {
    await transaction(async (client) => {
      const { socialLinks } = await loadDb(client, ['socialLinks'])
      const link = socialLinks.find((item) => item.id === request.params.id)
      if (!link) throw linkNotFound()
      await client.query('DELETE FROM social_links WHERE id = $1', [link.id])
      await logActivity(client, request.admin.id, 'delete', 'social_link', link.id, `Removed the ${link.platform} link`)
    })
    response.status(204).end()
  }))

  // --- Settings -----------------------------------------------------------

  // { contact_email: { value, mediaId, media }, ... }
  router.get('/settings', route(async (request, response) => {
    const db = await loadDb(pool, ['settings', 'media'])
    const settings = Object.fromEntries(
      db.settings.map((setting) => [setting.key, { ...setting, media: db.media.find((media) => media.id === setting.mediaId) ?? null }])
    )
    response.json(resolveMediaUrls(settings, storage))
  }))

  // body: { contact_email: { value }, logo: { mediaId }, ... }
  router.patch('/settings', route(async (request, response) => {
    const changes = request.body ?? {}
    await transaction(async (client) => {
      const db = await loadDb(client, ['settings', 'media'])
      for (const [key, change] of Object.entries(changes)) {
        if (!SETTING_KEYS.includes(key)) throw new ApiError('invalid', `There’s no setting called “${key}”.`, { field: key })
        // A setting added after the database was seeded has no row yet.
        const setting = db.settings.find((item) => item.key === key) ?? { key, value: null, mediaId: null }

        if (change.value !== undefined) setting.value = change.value === null ? null : String(change.value).trim()
        if (change.mediaId !== undefined) {
          const media = change.mediaId && db.media.find((item) => item.id === change.mediaId)
          if (change.mediaId && !media) throw new ApiError('not_found', 'That file doesn’t exist. It may have been removed in another tab.', { field: key })
          if (media && media.kind !== FILE_SETTINGS[key]) {
            throw new ApiError('invalid', FILE_SETTINGS[key] === 'video' ? 'Pick a YouTube video for this.' : 'Pick an image for this.', { field: key })
          }
          setting.mediaId = change.mediaId || null
        }

        if (key === 'contact_email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(setting.value ?? '')) {
          throw new ApiError('invalid', 'Enter the contact email as name@example.com.', { field: key })
        }
        if (key === 'display_name' && !setting.value) throw new ApiError('invalid', 'The display name can’t be blank.', { field: key })

        await client.query(
          'INSERT INTO settings (key, value, media_id) VALUES ($1, $2, $3) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, media_id = EXCLUDED.media_id',
          [key, setting.value, setting.mediaId]
        )
      }
      await logActivity(client, request.admin.id, 'update', 'settings', null, `Edited ${settingNames(Object.keys(changes))}`)
    })
    response.status(204).end()
  }))

  return router
}

const linkNotFound = () => new ApiError('not_found', 'That link doesn’t exist. It may have been removed in another tab.')

function validateLink(link) {
  link.platform = String(link.platform).trim().toLowerCase()
  link.handle = String(link.handle ?? '').trim()
  link.url = String(link.url).trim()
  link.visible = Boolean(link.visible)
  if (!link.platform) throw new ApiError('invalid', 'Say which site the link is for, like “instagram”.', { field: 'platform' })
  if (!/^https:\/\/\S+$/.test(link.url)) throw new ApiError('invalid', 'Links need to start with https://', { field: 'url' })
}
