import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import Button from '../components/Button.jsx'

// The small pieces the admin screens share: form fields, the status badge, and
// the dialog. Kept here, not copied into each screen, so every field and
// dialog looks and behaves the same.

const INPUT =
  'w-full rounded-sm border bg-surface px-1.5 py-1 text-body text-ink hover:border-ink/45 focus-visible:border-primary disabled:opacity-60 '

// --- Fields ---------------------------------------------------------------

// Wraps one control with its label, hint and error. `children` is a function
// that receives the props the control needs (id, aria-*), so the label, hint
// and error are always wired to it.
function FieldShell({ label, hint, error, className = '', children }) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <label htmlFor={id} className="text-caption font-medium">
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && (
        <p id={hintId} className="text-small text-ink/65">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-caption font-medium text-ink">
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      )}
    </div>
  )
}

const borderFor = (error) => (error ? 'border-accent border-2' : 'border-ink/25')

export function TextField({ label, hint, error, className, ...input }) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={className}>
      {(aria) => <input className={INPUT + borderFor(error)} {...aria} {...input} />}
    </FieldShell>
  )
}

export function TextArea({ label, hint, error, className, rows = 4, ...input }) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={className}>
      {(aria) => <textarea rows={rows} className={INPUT + borderFor(error)} {...aria} {...input} />}
    </FieldShell>
  )
}

export function SelectField({ label, hint, error, className, children, ...input }) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={className}>
      {(aria) => (
        <select className={INPUT + borderFor(error) + ' cursor-pointer'} {...aria} {...input}>
          {children}
        </select>
      )}
    </FieldShell>
  )
}

export function Checkbox({ label, hint, className = '', ...input }) {
  const id = useId()
  return (
    <div className={`flex items-start gap-1 ${className}`}>
      <input id={id} type="checkbox" className="mt-0.5 size-2 shrink-0 cursor-pointer accent-primary" {...input} />
      <label htmlFor={id} className="cursor-pointer">
        <span className="text-body">{label}</span>
        {hint && <span className="block text-small text-ink/65">{hint}</span>}
      </label>
    </div>
  )
}

// --- Status ---------------------------------------------------------------

const STATUS_STYLES = {
  draft: 'border-ink/25 text-ink/80',
  ready: 'border-primary/60 text-primary',
  published: 'border-primary bg-primary text-surface',
  archived: 'border-ink/15 text-ink/55',
}

// The word is always there, so colour is never the only signal.
export function StatusBadge({ status }) {
  return (
    <span className={`inline-block rounded-full border px-1 font-mono text-small uppercase ${STATUS_STYLES[status]}`}>{status}</span>
  )
}

export const KIND_LABELS = { artwork: 'Artwork', model: '3D model', video: 'Video' }

// A line of feedback after an action ("Saved."), announced to screen readers.
export function Notice({ children, tone = 'info' }) {
  if (!children) return null
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-sm px-1.5 py-1 text-caption text-ink ${tone === 'error' ? 'bg-accent/15' : 'bg-primary/10'}`}
    >
      {children}
    </p>
  )
}

// --- Dialog ---------------------------------------------------------------

// A modal built on the browser's own <dialog>, which traps focus, closes on
// Esc and returns focus to what opened it. `open` is controlled by the parent.
export function Dialog({ open, onClose, title, children, wide = false }) {
  const ref = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // In a portal, so a dialog opened from inside a <form> isn't nested in it
  // (forms can't contain forms).
  return createPortal(
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => event.target === ref.current && onClose()}
      className={`m-auto w-[calc(100%-2rem)] rounded-lg border border-ink/10 bg-surface p-0 text-ink shadow-[0_8px_30px_rgb(11_21_51/0.25)] backdrop:bg-ink/50 ${
        wide ? 'max-w-[56rem]' : 'max-w-[28rem]'
      }`}
    >
      {open && (
        <div className="flex max-h-[85svh] flex-col gap-2 overflow-y-auto p-3">
          <h2 id={titleId} className="text-lead font-bold">
            {title}
          </h2>
          {children}
        </div>
      )}
    </dialog>,
    document.body
  )
}

// A yes/no question with a button named for what it does ("Archive Encore"),
// never "OK". Cancel is first in the tab order so the safe choice is the
// default.
export function ConfirmDialog({ open, title, children, confirmLabel, busy, onConfirm, onCancel }) {
  return (
    <Dialog open={open} onClose={onCancel} title={title}>
      <div className="text-ink/80">{children}</div>
      <div className="flex flex-wrap justify-end gap-1">
        <Button variant="outline" onClick={onCancel} autoFocus>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={busy}>
          {busy ? 'Working…' : confirmLabel}
        </Button>
      </div>
    </Dialog>
  )
}

// A text-sized button for row actions, so a dense table isn't full of big ones.
export function LinkButton({ className = '', ...props }) {
  return (
    <button
      type="button"
      className={`cursor-pointer text-caption text-primary underline-offset-2 hover:underline disabled:cursor-default disabled:opacity-50 ${className}`}
      {...props}
    />
  )
}
