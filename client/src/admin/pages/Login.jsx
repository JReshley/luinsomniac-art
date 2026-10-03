import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import Button from '../../components/Button.jsx'
import AuthCard, { Field } from '../AuthCard.jsx'
import { signIn, useSession } from '../auth.js'

export default function Login() {
  const session = useSession()
  const location = useLocation()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Back to the page that sent you here, or the dashboard.
  const from = location.state?.from?.pathname ?? '/admin'

  // Signed in, whether just now or already (another tab, the back button):
  // the session update re-renders this, and the redirect happens here.
  if (session) return <Navigate to={from} replace />

  async function handleSubmit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      await signIn(form.get('email'), form.get('password'))
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <AuthCard title="Sign in">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2" noValidate>
        <Field label="Email" id="email" name="email" type="email" autoComplete="username" required autoFocus />
        <Field label="Password" id="password" name="password" type="password" autoComplete="current-password" required />

        {error && (
          <p role="alert" className="rounded-sm bg-accent/15 px-1.5 py-1 text-caption text-ink">
            {error}
          </p>
        )}

        <Button type="submit" disabled={busy} className="mt-1">
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>

        <Link to="/admin/reset-password" className="self-start text-caption text-primary underline-offset-2 hover:underline">
          Forgot password?
        </Link>
      </form>
    </AuthCard>
  )
}
