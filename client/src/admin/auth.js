// Who is signed in to the admin. The screens import from here and don't know
// which sign-in is behind it:
//
//   mock on (the default)   authMock.js      a placeholder: any password works
//   mock off                authSupabase.js  Supabase Auth, checked against the
//                                            `admins` allowlist by the API
//
// The two have the same exports, and the choice follows the same switch as the
// data layer (VITE_USE_MOCK_API), so they're never mixed.

import { USE_MOCK } from '../api/index.js'
import * as mock from './authMock.js'
import * as supabase from './authSupabase.js'

const auth = USE_MOCK ? mock : supabase

export const useSession = auth.useSession
export const useAuthReady = auth.useAuthReady
export const useRecovery = auth.useRecovery
export const getSession = auth.getSession
export const signIn = auth.signIn
export const signOut = auth.signOut
export const requestPasswordReset = auth.requestPasswordReset
export const updatePassword = auth.updatePassword
