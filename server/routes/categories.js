import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { pool, transaction } from '../db/pool.js'
import { logActivity } from '../activity.js'
import { ApiError, route } from '../errors.js'
import { loadDb } from '../rows.js'
import { slugify } from '../workRules.js'

// Categories: the Museum's filter chips, in order.

export function categoryRoutes() {
  const router = Router()
  const notFound = () => new ApiError('not_found', 'That category doesn’t exist. It may have been removed in another tab.')

  // In display order. Each has `workCount`, archived works included, since
  // those still point at it.
  router.get('/', route(async (request, response) => {
    const db = await loadDb(pool, ['categories', 'works'])
    response.json(
      db.categories
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((category) => ({ ...category, workCount: db.works.filter((work) => work.categoryId === category.id).length }))
    )
  }))

  // New categories go at the end of the row.
  router.post('/', route(async (request, response) => {
    const category = await transaction(async (client) => {
      const { categories } = await loadDb(client, ['categories'])
      const row = { id: randomUUID(), name: '', slug: '', sortOrder: Math.max(-1, ...categories.map((c) => c.sortOrder)) + 1 }
      applyName(categories, row, request.body ?? {})
      await client.query('INSERT INTO categories (id, name, slug, sort_order) VALUES ($1, $2, $3, $4)', [row.id, row.name, row.slug, row.sortOrder])
      await logActivity(client, request.admin.id, 'create', 'category', row.id, `Added the category “${row.name}”`)
      return row
    })
    response.status(201).json(category)
  }))

  // The whole order at once: body { ids: [every category id, in the new order] }.
  // Registered before /:id so "order" isn't read as an id.
  router.put('/order', route(async (request, response) => {
    const ids = request.body?.ids
    await transaction(async (client) => {
      const { categories } = await loadDb(client, ['categories'])
      if (!Array.isArray(ids) || ids.length !== categories.length || !categories.every((category) => ids.includes(category.id))) {
        throw new ApiError('invalid', 'The categories changed while you were sorting them. Reload and try again.')
      }
      for (const [i, id] of ids.entries()) await client.query('UPDATE categories SET sort_order = $1 WHERE id = $2', [i, id])
      await logActivity(client, request.admin.id, 'reorder', 'category', null, 'Reordered the categories')
    })
    response.status(204).end()
  }))

  // Renaming keeps the slug unless one is sent, so links to a filtered Museum
  // keep working.
  router.patch('/:id', route(async (request, response) => {
    const category = await transaction(async (client) => {
      const { categories } = await loadDb(client, ['categories'])
      const row = categories.find((item) => item.id === request.params.id)
      if (!row) throw notFound()
      const before = row.name
      applyName(categories, row, request.body ?? {})
      await client.query('UPDATE categories SET name = $1, slug = $2 WHERE id = $3', [row.name, row.slug, row.id])
      await logActivity(client, request.admin.id, 'update', 'category', row.id, before === row.name ? `Edited the category “${before}”` : `Renamed “${before}” to “${row.name}”`)
      return row
    })
    response.json(category)
  }))

  // Only empty categories can go; the error says how many works to move first.
  router.delete('/:id', route(async (request, response) => {
    await transaction(async (client) => {
      const db = await loadDb(client, ['categories', 'works'])
      const category = db.categories.find((item) => item.id === request.params.id)
      if (!category) throw notFound()
      const count = db.works.filter((work) => work.categoryId === category.id).length
      if (count) {
        throw new ApiError('in_use', `${count} ${count === 1 ? 'work is' : 'works are'} still in “${category.name}”. Move ${count === 1 ? 'it' : 'them'} to another category first.`)
      }
      await client.query('DELETE FROM categories WHERE id = $1', [category.id])
      await logActivity(client, request.admin.id, 'delete', 'category', category.id, `Removed the category “${category.name}”`)
    })
    response.status(204).end()
  }))

  return router
}

function applyName(categories, category, { name, slug }) {
  if (name !== undefined) category.name = String(name).trim()
  if (!category.name) throw new ApiError('invalid', 'Give the category a name.', { field: 'name' })
  if (category.name.length > 40) throw new ApiError('invalid', 'Keep category names under 40 characters; they’re filter chips.', { field: 'name' })
  if (categories.some((other) => other.id !== category.id && other.name.toLowerCase() === category.name.toLowerCase())) {
    throw new ApiError('conflict', `There’s already a category called “${category.name}”.`, { field: 'name' })
  }

  if (slug !== undefined || !category.slug) category.slug = slugify(String(slug ?? category.name))
  if (!category.slug) throw new ApiError('invalid', 'The slug needs at least one letter or number.', { field: 'slug' })
  if (categories.some((other) => other.id !== category.id && other.slug === category.slug)) {
    throw new ApiError('conflict', `Another category already uses the slug “${category.slug}”.`, { field: 'slug' })
  }
}
