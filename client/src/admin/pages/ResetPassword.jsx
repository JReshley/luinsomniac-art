import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/Button.jsx'
import AuthCard, { Field } from '../AuthCard.jsx'
import { requestPasswordReset } from '../auth.js'

// Where "Forgot password?" goes, and later where the reset email's link lands.
// For now it only has the first half: asking for the email. Choosing a new
// password needs Supabase's recovery link, so it comes with real auth.
export default function ResetPassword() {
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
