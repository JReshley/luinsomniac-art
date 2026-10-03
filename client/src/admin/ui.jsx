import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import BaseButton from '../components/Button.jsx'

// The small pieces the admin screens share: form fields, validation, drafts,
// the status badge, list toolbars, and dialogs. Kept here, not copied into each
// screen, so every field and dialog looks and behaves the same.
//
// Every control is at least 44px tall (WCAG AA touch target), and nothing in
// the admin bounces: motion is a 150–200ms colour or slide, ease-out.

// --- Buttons ----------------------------------------------------------------

// The site's Button, calm (colour fade, no spring) and without the public
// site's page wipe.
export function Button(props) {
  return <BaseButton calm viewTransition={false} {...props} />
}

// A text-sized button for row actions, so a dense list isn't full of big ones.
// Padded out to a 44px hit area.
export function LinkButton({ className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-[2.75rem] cursor-pointer items-center px-0.5 text-caption text-primary underline-offset-2 hover:underline disabled:cursor-default disabled:text-ink/45 disabled:no-underline ${className}`}
      {...props}
    />
  )
}

// --- Fields ---------------------------------------------------------------

const INPUT =
  'min-h-[2.75rem] w-full rounded-sm border bg-surface px-1.5 py-1 text-body text-ink hover:border-ink/45 focus-visible:border-primary disabled:opacity-60 '

// A smaller input for fields inside a list row (a caption, a name). Same 44px
// height, secondary text size.
export const ROW_INPUT =
  'min-h-[2.75rem] w-full rounded-sm border bg-surface px-1 py-0.5 text-caption text-ink hover:border-ink/45 focus-visible:border-primary '

export const borderFor = (error) => (error ? 'border-accent border-2' : 'border-ink/25')

// The words after a label: a star for required, "(optional)" for optional.
// Fields that are neither (filters, search) pass neither.
export function LabelMark({ required, optional }) {
  if (required) return <span aria-hidden="true" className="text-accent"> *</span>
  if (optional) return <span className="font-normal text-ink/65"> (optional)</span>
  return null
}

export function FieldError({ id, children }) {
  if (!children) return null
  return (
    <p id={id} role="alert" className="text-caption font-medium text-ink">
      <span aria-hidden="true">⚠ </span>
      {children}
    </p>
  )
}

// Wraps one control with its label, hint and error. `children` is a function
// that receives the props the control needs (id, aria-*), so the label, hint
// and error are always wired to it. The error takes the hint's place.
function FieldShell({ label, hint, error, required, optional, className = '', children }) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = (error ? errorId : hint && hintId) || undefined

  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <label htmlFor={id} className="text-caption font-medium">
        {label}
        <LabelMark required={required} optional={optional} />
      </label>
      {children({ id, required, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error ? (
        <FieldError id={errorId}>{error}</FieldError>
      ) : (
        hint && (
          <p id={hintId} className="text-small text-ink/65">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

export function TextField({ label, hint, error, optional, required, className, ...input }) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} optional={optional} className={className}>
      {(aria) => <input className={INPUT + borderFor(error)} {...aria} {...input} />}
    </FieldShell>
  )
}

export function TextArea({ label, hint, error, optional, required, className, rows = 4, ...input }) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} optional={optional} className={className}>
      {(aria) => <textarea rows={rows} className={INPUT + borderFor(error)} {...aria} {...input} />}
    </FieldShell>
  )
}

export function SelectField({ label, hint, error, optional, required, className, children, ...input }) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} optional={optional} className={className}>
      {(aria) => (
        <select className={INPUT + borderFor(error) + ' cursor-pointer'} {...aria} {...input}>
          {children}
        </select>
      )}
    </FieldShell>
  )
}

// The label is the hit area too, so the row is at least 44px tall.
export function Checkbox({ label, hint, className = '', ...input }) {
  const id = useId()
  return (
    <div className={`flex min-h-[2.75rem] items-start gap-1 py-0.5 ${className}`}>
      <input id={id} type="checkbox" className="mt-0.5 size-2 shrink-0 cursor-pointer accent-primary" {...input} />
      <label htmlFor={id} className="cursor-pointer">
        <span className="text-body">{label}</span>
        {hint && <span className="block text-small text-ink/65">{hint}</span>}
      </label>
    </div>
  )
}

// --- Validation -------------------------------------------------------------

// Field checks that run when you leave a field, not while you type, and clear
// as soon as you start fixing it. Errors the server sends back (with a
// `field`) land in the same place.
//
//   const v = useValidation({ title: (value) => !value.trim() && 'Give the work a title.' })
//   <TextField onBlur={v.blur('title', form.title)} error={v.errors.title} />
//   onChange: v.clear('title')
//   on submit: const first = v.checkAll(values); if (first) focus it
export function useValidation(rules) {
  const [errors, setErrors] = useState({})
  const rulesRef = useRef(rules)
  rulesRef.current = rules

  const messageFor = (name, value) => rulesRef.current[name]?.(value) || ''

  return {
    errors,
    blur: (name, value) => () => setErrors((prev) => ({ ...prev, [name]: messageFor(name, value) })),
    clear: (name) => setErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev)),
    // Checks every rule; returns the first failing field's name, or null.
    checkAll(values) {
      const next = Object.fromEntries(Object.keys(rulesRef.current).map((name) => [name, messageFor(name, values[name])]))
      setErrors(next)
      return Object.keys(next).find((name) => next[name]) ?? null
    },
    set: (name, message) => setErrors((prev) => ({ ...prev, [name]: message })),
    reset: () => setErrors({}),
  }
}

// The checks forms share.
export const rules = {
  required: (message) => (value) => !String(value ?? '').trim() && message,
  https: (value) => String(value ?? '').trim() !== '' && !/^https:\/\/\S+$/.test(value.trim()) && 'Start the link with https://',
  email: (value) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? '').trim()) && 'Enter the email as name@example.com.',
  wholeNumber: (message) => (value) => String(value ?? '').trim() !== '' && !/^\d+$/.test(String(value).trim()) && message,
  year: (value) => {
    const text = String(value ?? '').trim()
    return text !== '' && !(/^\d{4}$/.test(text) && Number(text) >= 1900 && Number(text) <= 2100) && 'Enter the year as four digits, like 2026.'
  },
}

// Moves to a field by its `name` attribute, after a failed save.
export function focusField(name) {
  requestAnimationFrame(() => {
    const field = document.querySelector(`[name="${name}"]`)
    field?.focus()
    field?.scrollIntoView({ block: 'center' })
  })
}

// --- Drafts -----------------------------------------------------------------

// Unsaved form contents are kept in this browser, so a refresh, a closed tab or
// a mis-click doesn't lose them. Stored only while the form differs from what's
// saved; cleared on save.
const DRAFT_PREFIX = 'luinsomniac-admin-draft:'

export function readDraft(key) {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_PREFIX + key))
  } catch {
    return null
  }
}

export function clearDraft(key) {
  try {
    localStorage.removeItem(DRAFT_PREFIX + key)
  } catch {
    // Storage blocked: there was nothing kept to clear.
  }
}

export function useDraft(key, value, dirty) {
  const json = JSON.stringify(value)
  useEffect(() => {
    try {
      if (dirty) localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify({ value: JSON.parse(json), at: Date.now() }))
      else localStorage.removeItem(DRAFT_PREFIX + key)
    } catch {
      // Private mode or blocked storage: the form still works, just unsaved.
    }
  }, [key, json, dirty])
}

// The line shown when a form opens with a kept draft, with a way to drop it.
export function DraftNotice({ at, onDiscard }) {
  if (!at) return null
  return (
    <div role="status" className="flex flex-wrap items-center gap-x-1 rounded-sm bg-primary/10 px-1.5 text-caption">
      <span>Restored your unsaved changes from {new Date(at).toLocaleString()}.</span>
      <LinkButton onClick={onDiscard}>Discard them</LinkButton>
    </div>
  )
}

// --- Status ---------------------------------------------------------------

// The admin shows three states: Draft, Published and Archived. The database
// also has 'ready', from an earlier review step; it is private like a draft,
// so it's shown and filtered as one.
export const shownStatus = (status) => (status === 'ready' ? 'draft' : status)

const STATUS_STYLES = {
  draft: 'border-ink/25 text-ink/80',
  published: 'border-primary bg-primary text-surface',
  archived: 'border-ink/15 text-ink/55',
}

// The word is always there, so colour is never the only signal.
export function StatusBadge({ status }) {
  const shown = shownStatus(status)
  return <span className={`inline-block rounded-full border px-1 font-mono text-small uppercase ${STATUS_STYLES[shown]}`}>{shown}</span>
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

// --- Loading, errors and empty states -----------------------------------------

// What a screen shows when its data didn't arrive: what failed, that nothing
// was lost, how to retry, and the details to send if it keeps happening.
export function LoadError({ what, error }) {
  const [copied, setCopied] = useState(false)
  if (!error) return null

  async function copy() {
    const details = [`Couldn’t load ${what}`, `Page: ${location.href}`, `Error: ${error.code ?? error.name ?? 'Error'}: ${error.message}`, `Time: ${new Date().toISOString()}`].join('\n')
    try {
      await navigator.clipboard.writeText(details)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div role="alert" className="flex flex-col items-start gap-1 rounded-lg border border-ink/10 bg-surface p-2">
      <p className="font-medium">The {what} couldn’t load.</p>
      <p className="text-caption text-ink/80">Nothing you saved is lost. Reload the page to try again.</p>
      <div className="flex flex-wrap items-center gap-1">
        <Button onClick={() => location.reload()}>Reload page</Button>
        <Button variant="outline" onClick={copy}>Copy error details</Button>
        <span role="status" className="text-caption text-ink/65">{copied ? 'Copied.' : ''}</span>
      </div>
    </div>
  )
}

// The line beside a page title about data that's already on screen: a quiet
// "Updating…" while it reloads after a save (only if that takes over 300ms, so
// it doesn't flicker), and a warning with Try again when the reload failed and
// what's shown may be out of date. `sources` are useApi() results.
export function RefreshStatus({ sources }) {
  const shown = sources.filter((source) => source.data !== undefined)
  const failed = shown.find((source) => source.error)
  const busy = shown.some((source) => source.loading)
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    if (!busy) return setSlow(false)
    const timer = setTimeout(() => setSlow(true), 300)
    return () => clearTimeout(timer)
  }, [busy])

  if (failed && !busy) {
    return (
      <span role="alert" className="flex flex-wrap items-center gap-x-1 text-caption text-ink">
        <span><span aria-hidden="true">⚠ </span>Couldn’t refresh, so this may be out of date.</span>
        <LinkButton onClick={() => shown.forEach((source) => source.reload())}>Try again</LinkButton>
      </span>
    )
  }
  return (
    <span role="status" className="text-caption text-ink/65">
      {busy && slow ? 'Updating…' : ''}
    </span>
  )
}

// Changing a loaded list straight after a save, before the reload confirms it.
// Both are safe to run on a list that already has the change.
export const withRow = (rows, row) => (rows && row?.id ? (rows.some((item) => item.id === row.id) ? rows.map((item) => (item.id === row.id ? { ...item, ...row } : item)) : [...rows, row]) : rows)
export const withoutRow = (rows, id) => rows?.filter((item) => item.id !== id)

// Grey blocks in the shape of what's loading, shown while data is on its way.
// They pulse only for people who haven't asked for less motion.
export function Skeleton({ rows = 4, className = '' }) {
  return (
    <div aria-busy="true" aria-label="Loading" className={`flex flex-col divide-y divide-ink/10 rounded-lg border border-ink/10 bg-surface ${className}`}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-2 p-2">
          <span className="size-6 shrink-0 rounded-sm bg-ink/10 motion-safe:animate-pulse" />
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="h-2 w-1/2 rounded-sm bg-ink/10 motion-safe:animate-pulse" />
            <span className="h-1.5 w-1/3 rounded-sm bg-ink/5 motion-safe:animate-pulse" />
          </span>
        </div>
      ))}
    </div>
  )
}

// A zero state: what belongs here, why fill it, and the action that does.
export function EmptyState({ title, children, action }) {
  return (
    <div className="flex flex-col items-start gap-1 p-2">
      <p className="font-medium">{title}</p>
      {children && <p className="text-caption text-ink/65">{children}</p>}
      {action}
    </div>
  )
}

// --- Lists ------------------------------------------------------------------

// The toolbar of a list page: a labelled search box, one Filters control that
// opens a panel of every filter, the chosen filters as removable chips, and
// anything else (a sort) at the end. "/" jumps to the search box.
//
// filters: [{ name, label, options: [[value, label]] }]  or  { name, label, checkbox: true }
// values:  { [name]: value }   onFilter(name, value)
export function ListToolbar({ search, onSearch, searchHint, filters, values, onFilter, onClearAll, children }) {
  const [open, setOpen] = useState(false)
  const searchRef = useRef(null)
  const panelId = useId()
  const searchId = useId()

  useEffect(() => {
    const handleKeyDown = (event) => {
      const typing = event.target.closest?.('input, textarea, select, [contenteditable]')
      if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const labelFor = (filter, value) => (filter.checkbox ? filter.label : `${filter.label}: ${filter.options.find(([option]) => option === value)?.[1] ?? value}`)
  const active = filters.filter((filter) => values[filter.name])

  return (
    <div className="mb-2 flex flex-col gap-1">
      <div className="flex flex-wrap items-end gap-1">
        <div className="flex min-w-[12rem] flex-1 flex-col gap-0.5">
          <label htmlFor={searchId} className="text-caption font-medium">
            Search <kbd className="ml-0.5 rounded-sm border border-ink/20 px-0.5 font-mono text-small font-normal text-ink/65">/</kbd>
          </label>
          <input
            id={searchId}
            ref={searchRef}
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            aria-describedby={searchHint ? `${searchId}-hint` : undefined}
            className={INPUT + 'border-ink/25'}
          />
          {searchHint && <span id={`${searchId}-hint`} className="sr-only">{searchHint}</span>}
        </div>
        <Button variant="outline" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}>
          Filters{active.length > 0 && ` (${active.length})`}
        </Button>
        {children}
      </div>

      <div id={panelId} hidden={!open} className="rounded-lg border border-ink/10 bg-surface p-2">
        <div className="grid gap-2 md:grid-cols-3 md:items-end">
          {filters.map((filter) =>
            filter.checkbox ? (
              <Checkbox key={filter.name} label={filter.label} checked={Boolean(values[filter.name])} onChange={(event) => onFilter(filter.name, event.target.checked ? '1' : '')} />
            ) : (
              <SelectField key={filter.name} label={filter.label} value={values[filter.name] ?? ''} onChange={(event) => onFilter(filter.name, event.target.value)}>
                <option value="">Any</option>
                {filter.options.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </SelectField>
            )
          )}
        </div>
      </div>

      {active.length > 0 && (
        <ul aria-label="Active filters" className="flex flex-wrap items-center gap-0.5">
          {active.map((filter) => (
            <li key={filter.name}>
              <button
                type="button"
                onClick={() => onFilter(filter.name, '')}
                aria-label={`Remove filter ${labelFor(filter, values[filter.name])}`}
                className="inline-flex min-h-[2.75rem] cursor-pointer items-center gap-0.5 rounded-full border border-ink/25 bg-surface px-1.5 text-caption hover:bg-ink/5"
              >
                {labelFor(filter, values[filter.name])} <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
          <li>
            <LinkButton onClick={onClearAll}>Clear all filters</LinkButton>
          </li>
        </ul>
      )}
    </div>
  )
}

// Page through a list that's already loaded. Always shown, even on one page,
// so the count is always there.
export const PAGE_SIZE = 25

export function Pager({ page, total, onPage, noun }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const last = Math.min(total, page * PAGE_SIZE)
  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-1 border-t border-ink/10 px-1.5 py-0.5 text-caption">
      <span className="text-ink/65">
        {first}–{last} of {total} {total === 1 ? noun : `${noun}s`}
      </span>
      <span className="flex gap-1">
        <LinkButton disabled={page <= 1} onClick={() => onPage(page - 1)}>← Previous page</LinkButton>
        <LinkButton disabled={page >= pages} onClick={() => onPage(page + 1)}>Next page →</LinkButton>
      </span>
    </nav>
  )
}

// --- Dialogs ----------------------------------------------------------------

// A modal built on the browser's own <dialog>, which traps focus, closes on
// Esc and returns focus to what opened it. `open` is controlled by the parent.
//
// `side` makes it a slide-over from the right edge instead: for quick jobs
// (choosing a file) that shouldn't cover the page you're on.
export function Dialog({ open, onClose, title, children, wide = false, side = false }) {
  const ref = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const placement = side
    ? 'm-0 ml-auto h-svh max-h-none w-full max-w-[36rem] rounded-none border-l motion-safe:open:animate-[slide-in_200ms_ease-out]'
    : `m-auto w-[calc(100%-2rem)] rounded-lg border ${wide ? 'max-w-[56rem]' : 'max-w-[28rem]'}`

  // In a portal, so a dialog opened from inside a <form> isn't nested in it
  // (forms can't contain forms).
  return createPortal(
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => event.target === ref.current && onClose()}
      className={`${placement} border-ink/10 bg-surface p-0 text-ink shadow-[0_4px_24px_rgb(11_21_51/0.07)] backdrop:bg-ink/40`}
    >
      {open && (
        <div className={`flex flex-col gap-2 overflow-y-auto p-3 ${side ? 'h-full' : 'max-h-[85svh]'}`}>
          <div className="flex items-center justify-between gap-2">
            <h2 id={titleId} className="text-lead leading-[1.25] font-bold">
              {title}
            </h2>
            {side && <LinkButton onClick={onClose}>Close</LinkButton>}
          </div>
          {children}
        </div>
      )}
    </dialog>,
    document.body
  )
}

// A yes/no question with a button named for what it does ("Archive Encore"),
// never "OK". Cancel has focus first so the safe choice is the default, and
// the confirm button is red when it takes something away.
export function ConfirmDialog({ open, title, children, confirmLabel, busy, onConfirm, onCancel, destructive = true }) {
  return (
    <Dialog open={open} onClose={onCancel} title={title}>
      <div className="text-ink/80">{children}</div>
      <div className="flex flex-wrap justify-end gap-1">
        <Button variant="outline" onClick={onCancel} autoFocus>
          Cancel
        </Button>
        <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>
          {busy ? 'Working…' : confirmLabel}
        </Button>
      </div>
    </Dialog>
  )
}
