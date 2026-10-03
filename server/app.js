import express from 'express'
import cors from 'cors'
import { pool } from './db/pool.js'
import { requireAdmin } from './auth.js'
import { errorHandler } from './errors.js'
import { categoryRoutes } from './routes/categories.js'
import { contentRoutes } from './routes/content.js'
import { dashboardRoutes } from './routes/dashboard.js'
import { mediaRoutes } from './routes/media.js'
import { publicRoutes } from './routes/public.js'
import { workRoutes } from './routes/works.js'

// The API, built from what it needs from outside (Supabase's token check and
// file bucket), so a test can pass stand-ins and server.js passes the real ones.
//
//   /api/*         public: published works, categories and site content
//   /api/admin/*   needs a signed-in admin (see auth.js)
export function createApp({ verifyToken, storage, allowedOrigins }) {
  const app = express()

  // CORS before the routes. Middleware registered after a route never sees that
  // route's requests.
  //
  // Name your origins. app.use(cors()) with no options sends
  // Access-Control-Allow-Origin: *, which lets any site on the internet call
  // this API from a visitor's browser.
  app.use(cors({ origin: allowedOrigins }))
  app.use(express.json({ limit: '100kb' }))

  // Is the process alive?
  app.get('/healthz', (request, response) => {
    response.json({ ok: true })
  })

  // Is the database reachable? A different question, and the one that tells you
  // in two seconds which half of a problem you have.
  app.get('/readyz', async (request, response) => {
    try {
      await pool.query('SELECT 1')
      response.json({ ok: true, db: 'up' })
    } catch (error) {
      console.error('readyz failed:', error.message)
      response.status(503).json({ ok: false, db: 'down' })
    }
  })

  app.use('/api', publicRoutes({ storage }))

  const admin = express.Router()
  admin.use(requireAdmin(verifyToken))
  // Who is signed in, once the allowlist has accepted them. The admin screens
  // call this right after signing in to learn the name to greet them with.
  admin.get('/me', (request, response) => response.json({ id: request.admin.id, name: request.admin.name, email: request.admin.email }))
  admin.use('/works', workRoutes({ storage }))
  admin.use('/media', mediaRoutes({ storage }))
  admin.use('/categories', categoryRoutes())
  admin.use(contentRoutes({ storage }))
  admin.use(dashboardRoutes())
  app.use('/api/admin', admin)

  app.use((request, response) => {
    response.status(404).json({ code: 'not_found', message: 'No such route' })
  })

  app.use(errorHandler)
  return app
}
