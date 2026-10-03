// An error with a message fit to show the admin, and a code the screens can
// check. The mock and the real API both fail with one of these.
//   not_found        no record with that id
//   invalid          a field failed validation; `field` names it
//   conflict         a unique field (a slug) is already taken
//   publish_blocked  the publish gate refused; `reasons` lists why
//   in_use           can't remove something other records point at
//   unauthorized     not signed in, or the session ran out
//   forbidden        signed in, but not an admin
//   network          the server couldn't be reached
//   storage_full     the browser has no room left (mock only)
export class ApiError extends Error {
  constructor(code, message, details = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    Object.assign(this, details)
  }
}
