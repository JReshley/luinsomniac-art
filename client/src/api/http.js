// One place that talks to the Express API: it adds the admin's sign-in token,
// turns the server's error replies into ApiErrors the screens already handle,
// and tells useApi() when something was saved so lists reload.

import { ApiError } from './errors.js'
import { notify } from './changes.js'

// No trailing slash. Empty means "same address as the page", which is how the
// dev server proxies it if you set that up.
const BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

// The supabase-js library is only downloaded when an admin is actually using
// the API, so visitors reading the public site never load it.
async function supabase() {
  return (await import('../lib/supabase.js')).getSupabase()
}

async function accessToken() {
  const { data } = await (await supabase()).auth.getSession()
  return data.session?.access_token ?? null
}

function queryString(query) {
  const params = new URLSearchParams()
  for (const [name, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '' && value !== false) params.set(name, String(value))
  }
  const text = params.toString()
  return text ? `?${text}` : ''
}

// request('GET', '/api/admin/works', { query: { kind: 'model' } })
// request('PATCH', `/api/admin/works/${id}`, { body: changes })
//
// Resolves with the parsed JSON (or undefined for an empty reply), or fails
// with an ApiError. Anything under /api/admin is sent with the admin's token.
export async function request(method, path, { query, body } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const admin = path.startsWith('/api/admin')
  if (admin) {
    const token = await accessToken()
    if (!token) throw new ApiError('unauthorized', 'Sign in to continue.')
    headers.Authorization = `Bearer ${token}`
  }

  let response
  try {
    response = await fetch(`${BASE}${path}${queryString(query)}`, {
      method,
      headers,
      // Admin data changes under you (the other admin, your own last save), so
      // never answer from the browser's cache.
      cache: admin ? 'no-store' : 'default',
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('network', 'Couldn’t reach the server. Check your connection and try again.')
  }

  const text = await response.text()
  let data
  try {
    data = text ? JSON.parse(text) : undefined
  } catch {
    data = undefined
  }

  if (!response.ok) {
    // The session ran out or was revoked: signing out sends the admin back to
    // the login page instead of leaving every screen failing.
    if (admin && response.status === 401) (await supabase()).auth.signOut()
    const { code, message, ...details } = data ?? {}
    throw new ApiError(code ?? 'server_error', message ?? 'Something went wrong on the server. Try again in a moment.', details)
  }

  if (method !== 'GET') notify()
  return data
}

// Coming back to the tab after a while, reload what's on screen: the other
// admin may have changed things meanwhile. At most once every 20 seconds.
let lastRefresh = Date.now()
window.addEventListener('focus', () => {
  if (Date.now() - lastRefresh < 20_000) return
  lastRefresh = Date.now()
  notify()
})
