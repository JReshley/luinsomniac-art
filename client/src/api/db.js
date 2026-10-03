// The mock database behind the data layer (admin plan, phase 2).
//
// One object of tables shaped like the draft schema in private/admin-plan.md,
// kept in localStorage so edits survive a reload. Uploaded file contents are
// too big for localStorage and live in IndexedDB instead (blobs.js).
//
// Nothing outside src/api/ touches this file. Pages call the functions in
// api/index.js, which keep the same names and return the same shapes once
// they're rewritten to call the Express API (phase 6). Then this file goes.
//
// Field names are camelCase here and in what the API returns. The Postgres
// columns are snake_case; Express does the mapping.

import { getSession } from '../admin/auth.js'
import { buildSeed } from './seed.js'

const KEY = 'luinsomniac-admin-db'

// Bump when the table shapes change. A saved copy from an older version is
// thrown away and reseeded, since the mock has nothing worth migrating.
const VERSION = 1

// A short pause on every call, as a real request would have, so loading
// states get built and seen now rather than discovered in phase 6.
const LATENCY_MS = 120

// An error with a message fit to show the admin, and a code the screens can
// check (the same codes the Express API will send back).
//   not_found        no record with that id
//   invalid          a field failed validation; `field` names it
//   conflict         a unique field (a slug) is already taken
//   publish_blocked  the publish gate refused; `reasons` lists why
//   in_use           can't remove something other records point at
//   storage_full     the browser has no room left (mock only)
export class ApiError extends Error {
  constructor(code, message, details = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    Object.assign(this, details)
  }
}

let db = load()

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY))
    if (saved?.version === VERSION) return saved
  } catch {
    // Unreadable or blocked storage: start from the seed.
  }
  const fresh = buildSeed(VERSION)
  persist(fresh)
  return fresh
}

function persist(next) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch (err) {
    if (err?.name === 'QuotaExceededError') {
      throw new ApiError('storage_full', 'The browser’s storage is full, so that change couldn’t be saved.')
    }
    // Storage blocked (private mode): changes last until the tab closes.
  }
}

// --- Change notifications -------------------------------------------------
// useApi() re-runs its call whenever the data changes, here or in another tab.

const listeners = new Set()

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify() {
  listeners.forEach((listener) => listener())
}

window.addEventListener('storage', (event) => {
  if (event.key !== KEY) return
  db = load()
  notify()
})

// --- Reading and writing --------------------------------------------------

const pause = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS))

// Runs a read against a copy of the tables, so a caller can't change the
// stored data by editing what it got back.
export async function query(read) {
  await pause()
  return structuredClone(read(db))
}

// Runs a change against a draft copy of the tables. If `write` throws, the
// draft is dropped and nothing is saved, the way a failed SQL transaction
// rolls back. `write` gets the draft and { actorId, now } for stamping rows.
export async function mutate(write) {
  await pause()
  const draft = structuredClone(db)
  const result = write(draft, { actorId: getSession()?.id ?? null, now: new Date().toISOString() })
  persist(draft)
  db = draft
  notify()
  return structuredClone(result)
}

// Adds a row to activity_log. Called inside a mutate() so the entry is saved
// with the change it describes, or not at all.
export function logActivity(draft, { actorId, now }, action, entity, entityId, summary) {
  draft.activityLog.push({ id: newId(), actorId, action, entity, entityId, summary, createdAt: now })
}

export const newId = () => crypto.randomUUID()

// Throws not_found unless the table has a row with this id.
export function findRow(table, id, label) {
  const row = table.find((item) => item.id === id)
  if (!row) throw new ApiError('not_found', `That ${label} doesn’t exist. It may have been removed in another tab.`)
  return row
}

// Starts the tables over from the seed. index.js wraps this to clear uploads too.
export async function resetDatabase() {
  db = buildSeed(VERSION)
  persist(db)
  notify()
}
