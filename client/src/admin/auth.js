// Placeholder admin sign-in until Supabase Auth is wired up (admin plan, phase 6).
//
// It keeps a fake session in localStorage so the admin screens can be built and
// clicked through now. It checks nothing a real attacker couldn't skip: anyone
// can set the key by hand. That is fine while the admin only edits mock data in
// the same browser, and it is why this file gets replaced, not extended.
//
// The function names match what the Supabase version will need (signIn,
// signOut, requestPasswordReset, useSession), so the screens won't change.

import { useSyncExternalStore } from 'react'

const KEY = 'luinsomniac-admin-session'

// The two admins from the plan. The real allowlist is the `admins` table; the
// ids match the mock database's admins (api/seed.js).
export const ADMINS = {
  john: { id: 'admin-john', name: 'John' },
  lui: { id: 'admin-lui', name: 'Lui' },
}

function read() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

// useSyncExternalStore compares snapshots with ===, so it gets the raw string
// (stable between renders) and the hook parses it.
const listeners = new Set()

function subscribe(listener) {
  listeners.add(listener)
  // Another tab signing in or out updates this one too.
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

function write(value) {
  try {
    if (value === null) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, value)
  } catch {
    // Private mode or blocked storage: the session just won't survive a reload.
  }
  listeners.forEach((listener) => listener())
}

function parse(raw) {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

// The signed-in admin ({ id, email, name }), or null.
export function useSession() {
  return parse(useSyncExternalStore(subscribe, read))
}

// The same outside React: the mock data layer uses it to stamp who made a
// change. The real API gets that from the request's token instead.
export function getSession() {
  return parse(read())
}

// Resolves with the session, or rejects with a message fit to show the user.
// Any password works for now; the email's name part picks the admin, and any
// other address is turned away the way the real allowlist will be.
export async function signIn(email, password) {
  const address = email.trim().toLowerCase()
  if (!address || !password) throw new Error('Enter your email and password.')

  const admin = ADMINS[address.split('@')[0]]
  if (!admin) throw new Error('That email and password don’t match an admin account.')

  const session = { ...admin, email: address }
  write(JSON.stringify(session))
  return session
}

export function signOut() {
  write(null)
}

// Supabase answers the same way whether or not the address exists, so nobody
// can use the form to find out who the admins are. The mock does too.
export async function requestPasswordReset(email) {
  if (!email.trim()) throw new Error('Enter the email you sign in with.')
}
