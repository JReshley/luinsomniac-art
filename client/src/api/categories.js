// Categories: the Museum's filter chips, in order. Future endpoints:
//   GET    /api/admin/categories             listCategories()
//   POST   /api/admin/categories             createCategory({ name })
//   PATCH  /api/admin/categories/:id         updateCategory(id, { name, slug })
//   PUT    /api/admin/categories/order       reorderCategories(ids)
//   DELETE /api/admin/categories/:id         deleteCategory(id)

import { ApiError, findRow, logActivity, mutate, newId, query } from './db.js'
import { slugify } from './seed.js'

// In display order. Each has `workCount`, archived works included, since those
// still point at it.
export function listCategories() {
  return query((db) =>
    [...db.categories]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((category) => ({ ...category, workCount: db.works.filter((work) => (work.categoryIds ?? []).includes(category.id)).length }))
  )
}

// New categories go at the end of the row.
export function createCategory({ name }) {
  return mutate((db, ctx) => {
    const category = { id: newId(), name: '', slug: '', sortOrder: Math.max(-1, ...db.categories.map((c) => c.sortOrder)) + 1 }
    applyName(db, category, { name })
    db.categories.push(category)
    logActivity(db, ctx, 'create', 'category', category.id, `Added the category “${category.name}”`)
    return category
  })
}

// Renaming keeps the slug unless one is passed, so links to a filtered Museum
// keep working.
export function updateCategory(id, changes) {
  return mutate((db, ctx) => {
    const category = findRow(db.categories, id, 'category')
    const before = category.name
    applyName(db, category, changes)
    logActivity(db, ctx, 'update', 'category', id, before === category.name ? `Edited the category “${before}”` : `Renamed “${before}” to “${category.name}”`)
    return category
  })
}

// ids: every category id, in the new order.
export function reorderCategories(ids) {
  return mutate((db, ctx) => {
    if (ids.length !== db.categories.length || !db.categories.every((category) => ids.includes(category.id))) {
      throw new ApiError('invalid', 'The categories changed while you were sorting them. Reload and try again.')
    }
    ids.forEach((id, i) => (findRow(db.categories, id, 'category').sortOrder = i))
    logActivity(db, ctx, 'reorder', 'category', null, 'Reordered the categories')
  })
}

// Only empty categories can go; the error says how many works to move first.
export function deleteCategory(id) {
  return mutate((db, ctx) => {
    const category = findRow(db.categories, id, 'category')
    const count = db.works.filter((work) => (work.categoryIds ?? []).includes(id)).length
    if (count) {
      throw new ApiError('in_use', `${count} ${count === 1 ? 'work is' : 'works are'} still in “${category.name}”. Untick it on ${count === 1 ? 'that work' : 'those works'} first (filter the works list by this category to find them).`)
    }
    db.categories = db.categories.filter((item) => item.id !== id)
    logActivity(db, ctx, 'delete', 'category', id, `Removed the category “${category.name}”`)
  })
}

function applyName(db, category, { name, slug }) {
  if (name !== undefined) category.name = String(name).trim()
  if (!category.name) throw new ApiError('invalid', 'Give the category a name.', { field: 'name' })
  if (category.name.length > 40) throw new ApiError('invalid', 'Keep category names under 40 characters; they’re filter chips.', { field: 'name' })
  if (db.categories.some((other) => other.id !== category.id && other.name.toLowerCase() === category.name.toLowerCase())) {
    throw new ApiError('conflict', `There’s already a category called “${category.name}”.`, { field: 'name' })
  }

  if (slug !== undefined || !category.slug) category.slug = slugify(slug ?? category.name)
  if (!category.slug) throw new ApiError('invalid', 'The slug needs at least one letter or number.', { field: 'slug' })
  if (db.categories.some((other) => other.id !== category.id && other.slug === category.slug)) {
    throw new ApiError('conflict', `Another category already uses the slug “${category.slug}”.`, { field: 'slug' })
  }
}
