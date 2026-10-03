// Errors the API sends back, in the shape the client's ApiError expects
// (client/src/api/db.js): { code, message, ...details }. `message` is written
// to be shown to the admin as it is.

export class ApiError extends Error {
  constructor(code, message, details = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.details = details
  }
}

const STATUS = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  invalid: 400,
  conflict: 409,
  in_use: 409,
  publish_blocked: 422,
}

// The rules in schema.sql refuse a bad row even when the checks in the routes
// miss it. Those refusals come back as Postgres errors; this turns the ones a
// person could cause into a message instead of a 500.
function fromPostgres(error) {
  switch (error.code) {
    case '23505':
      return new ApiError('conflict', 'That value is already used by something else.')
    case '23514':
      if (error.constraint === 'works_publish_gate') {
        return new ApiError('publish_blocked', 'That work can’t be published until it’s own work and any real face has consent.')
      }
      // Our own triggers raise check_violation with a message written for people.
      return new ApiError('invalid', error.constraint ? 'One of those values isn’t allowed.' : error.message)
    case '23503':
      return new ApiError('in_use', 'Something still uses that, or what it points at no longer exists.')
    default:
      return null
  }
}

export function errorHandler(error, request, response, next) {
  const known = error instanceof ApiError ? error : fromPostgres(error)
  if (!known) {
    // The detail goes in the logs; the visitor gets a plain message.
    console.error(error)
    return response.status(500).json({ code: 'server_error', message: 'Something went wrong on the server. Try again in a moment.' })
  }
  response.status(STATUS[known.code] ?? 400).json({ code: known.code, message: known.message, ...known.details })
}

// Wraps an async route so a thrown error reaches errorHandler.
export const route = (handler) => (request, response, next) => handler(request, response, next).catch(next)
