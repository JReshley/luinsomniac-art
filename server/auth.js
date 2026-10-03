import { pool } from './db/pool.js'
import { ApiError, route } from './errors.js'

// Signing in with Supabase is not enough to use the admin API. The token has to
// be genuine, and its user has to be a row in `admins`: sign-ups are switched
// off, but the allowlist is what holds if that ever changes.
export const requireAdmin = (verifyToken) =>
  route(async (request, response, next) => {
    const token = request.get('authorization')?.match(/^Bearer (.+)$/)?.[1]
    const user = token && (await verifyToken(token))
    if (!user) throw new ApiError('unauthorized', 'Sign in to continue.')

    const { rows } = await pool.query('SELECT display_name FROM admins WHERE user_id = $1', [user.id])
    if (rows.length === 0) throw new ApiError('forbidden', 'That account isn’t an admin.')

    request.admin = { id: user.id, name: rows[0].display_name, email: user.email }
    next()
  })
