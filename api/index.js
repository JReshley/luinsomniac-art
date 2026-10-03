// The API as a Vercel function. vercel.json sends /api/*, /healthz and /readyz
// here, and Express handles the rest, so the site and its API live at one
// address. Locally (and on a host like Render) server/server.js runs the same
// app as a normal process instead.
import { buildApp } from '../server/bootstrap.js'

export default buildApp().app
