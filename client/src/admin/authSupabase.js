// Sign-in with Supabase Auth. Used when the mock is off (VITE_USE_MOCK_API=false).
//
// Signing in with Supabase proves who someone is. It does not make them an
// admin: the API checks the signed-in user against the `admins` table, and this
// file asks it (GET /api/admin/me) right after, turning away anyone who isn't
// on the list. Sign-ups are switched off in Supabase, so there is no way to
// create an account here.
//
// Same exports as authMock.js, which is what the screens were built against.

import { useSyncExternalStore } from 'react'
import { getSupabase } from '../lib/supabase.js'

const API = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

// Everything the screens need to know, replaced (never edited) on each change
// so useSyncExternalStore sees a new snapshot.
//   ready      the stored session has been looked at, so "signed out" is real
//              and not just "not loaded yet"
//   session    { id, email, name } for a signed-in admin, or null
//   recovery   arrived from a password-reset email, and has to choose a password
let state = { ready: false, session: null, recovery: false }
const listeners = new Set()

function setState(patch) {
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  start()
  return () => listeners.delete(listener)
}

// Asks the API who this token belongs to. Resolves with the admin, or null if
// the account isn't on the allowlist; fails if the server can't be reached.
async function loadAdmin(token) {
  const response = await fetch(`${API}/api/admin/me`, { headers: { Authorization: `Bearer ${token}` } })
  if (response.status === 401 || response.status === 403) return null
  if (!response.ok) throw new Error('The server had a problem. Try again in a moment.')
  return response.json()
}

async function applySession(supabaseSession) {
  if (!supabaseSession) return setState({ ready: true, session: null })
  try {
    const admin = await loadAdmin(supabaseSession.access_token)
    if (!admin) {
      // A real Supabase user who isn't an admin gets nothing.
      await getSupabase().auth.signOut()
      return setState({ ready: true, session: null, recovery: false })
    }
    setState({ ready: true, session: { id: admin.id, email: admin.email, name: admin.name } })
  } catch {
    // Server down: stay signed out rather than showing screens that can't load.
    setState({ ready: true, session: null })
  }
}

let started = false

function start() {
  if (started) return
  started = true

  const supabase = getSupabase()
  // The reset email's link arrives with the session in the address. Noting it
  // here, before the library clears it, means the reset page knows to ask for
  // a new password even if the event below fires late.
  if (/type=recovery/.test(window.location.hash)) state = { ...state, recovery: true }

  supabase.auth.onAuthStateChange((event, supabaseSession) => {
    if (event === 'PASSWORD_RECOVERY') setState({ recovery: true })
    // Not awaited, and not calling back into supabase here: the library holds a
    // lock while it runs this callback.
    setTimeout(() => applySession(supabaseSession), 0)
  })
}

// The signed-in admin ({ id, email, name }), or null.
export function useSession() {
  return useSyncExternalStore(subscribe, () => state).session
}

// False until the stored session has been checked. Without this, reloading an
// admin page would flash the login page before the session was found.
export function useAuthReady() {
  return useSyncExternalStore(subscribe, () => state).ready
}

// True after following a password-reset email, until a new password is set.
export function useRecovery() {
  return useSyncExternalStore(subscribe, () => state).recovery
}

export function getSession() {
  return state.session
}

const WRONG = 'That email and password don’t match an admin account.'

// Resolves with the session, or rejects with a message fit to show the user.
// Wrong password, unknown email and "not an admin" all say the same thing, so
// the form can't be used to find out who the admins are.
export async function signIn(email, password) {
  const address = email.trim().toLowerCase()
  if (!address || !password) throw new Error('Enter your email and password.')

  const { data, error } = await getSupabase().auth.signInWithPassword({ email: address, password })
  if (error) {
    if (error.status === 429) throw new Error('Too many attempts. Wait a minute, then try again.')
    if (error.status >= 500 || error.name === 'AuthRetryableFetchError') throw new Error('Couldn’t reach the sign-in service. Try again in a moment.')
    throw new Error(WRONG)
  }

  const admin = await loadAdmin(data.session.access_token).catch(() => {
    throw new Error('Signed in, but the server couldn’t be reached to check your account. Try again in a moment.')
  })
  if (!admin) {
    await getSupabase().auth.signOut()
    throw new Error(WRONG)
  }

  const session = { id: admin.id, email: admin.email, name: admin.name }
  setState({ ready: true, session })
  return session
}

export async function signOut() {
  setState({ session: null, recovery: false })
  await getSupabase().auth.signOut()
}

// Supabase answers the same way whether or not the address exists.
export async function requestPasswordReset(email) {
  const address = email.trim()
  if (!address) throw new Error('Enter the email you sign in with.')

  // The link in the email brings the admin back to this page. The address must
  // be on Supabase's list of allowed redirect URLs.
  const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}admin/reset-password`
  const { error } = await getSupabase().auth.resetPasswordForEmail(address, { redirectTo })
  if (error?.status === 429) throw new Error('A reset email was just sent. Wait a minute before asking again.')
  if (error && (error.status >= 500 || error.name === 'AuthRetryableFetchError')) {
    throw new Error('Couldn’t reach the sign-in service. Try again in a moment.')
  }
}

// After following a reset email: sets the new password and ends recovery.
export async function updatePassword(password) {
  if (password.length < 8) throw new Error('Use at least 8 characters.')
  const { error } = await getSupabase().auth.updateUser({ password })
  if (error) {
    if (/same|different/i.test(error.message)) throw new Error('Choose a password you haven’t used before.')
    throw new Error('The password couldn’t be changed. The reset link may have expired; ask for a new one.')
  }
  setState({ recovery: false })
}
