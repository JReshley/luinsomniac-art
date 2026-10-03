import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../../components/Button.jsx'
import AuthCard, { Field } from '../AuthCard.jsx'
import { requestPasswordReset, updatePassword, useRecovery } from '../auth.js'

// Both halves of resetting a password. "Forgot password?" lands here to ask for
// the email. The link in that email lands here too, signed in for the one job
// of choosing a new password, and the page shows that form instead.
export default function ResetPassword() {
  return useRecovery() ? <ChoosePassword /> : <AskForLink />
}

function AskForLink() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    try {
      await requestPasswordReset(new FormData(event.currentTarget).get('email'))
      setSent(true)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AuthCard title="Reset password">
      {sent ? (
        <p role="status" className="text-ink/80">
          If that email belongs to an admin, a reset link is on its way. It can take a few minutes, so check your spam folder too.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2" noValidate>
          <p className="text-caption text-ink/65">Enter the email you sign in with and we&rsquo;ll send you a link to choose a new password.</p>
          <Field label="Email" id="email" name="email" type="email" autoComplete="username" required autoFocus />

          {error && (
            <p role="alert" className="rounded-sm bg-accent/15 px-1.5 py-1 text-caption text-ink">
              {error}
            </p>
          )}

          <Button type="submit" className="mt-1">
            Send reset link
          </Button>
        </form>
      )}

      <Link to="/admin/login" className="self-start text-caption text-primary underline-offset-2 hover:underline">
        ← Back to sign in
      </Link>
    </AuthCard>
  )
}

function ChoosePassword() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await updatePassword(new FormData(event.currentTarget).get('password'))
      navigate('/admin', { replace: true, viewTransition: false })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <AuthCard title="Choose a new password">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2" noValidate>
        <Field label="New password" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required autoFocus />
        <p className="-mt-1 text-small text-ink/65">At least 8 characters.</p>

        {error && (
          <p role="alert" className="rounded-sm bg-accent/15 px-1.5 py-1 text-caption text-ink">
            {error}
          </p>
        )}

        <Button type="submit" disabled={busy} className="mt-1">
          {busy ? 'Saving…' : 'Save password'}
        </Button>
      </form>
    </AuthCard>
  )
}
