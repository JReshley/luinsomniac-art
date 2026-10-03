import { createApp } from './app.js'
import { createSupabaseServices } from './supabase.js'

// Builds the API from the environment. server.js (a long-running process) and
// api/index.js (a Vercel function) both start from here, so they can't drift.
export function buildApp() {
  // Comma-separated origins allowed to call the API from a browser. Not needed
  // when the site and the API share an address, as they do on Vercel.
  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  const { verifyToken, storage } = createSupabaseServices()
  return { app: createApp({ verifyToken, storage, allowedOrigins }), allowedOrigins }
}
