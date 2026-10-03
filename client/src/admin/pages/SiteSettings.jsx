import { useState } from 'react'
import {
  createSocialLink,
  deleteSocialLink,
  getSettings,
  listMedia,
  listSiteText,
  listSocialLinks,
  reorderSocialLinks,
  updateSettings,
  updateSiteText,
  updateSocialLink,
  useApi,
} from '../../api/index.js'
import AdminPageHeader from '../AdminPageHeader.jsx'
import { MediaField } from '../MediaPicker.jsx'
import {
  Button,
  Checkbox,
  clearDraft,
  ConfirmDialog,
  DraftNotice,
  EmptyState,
  focusField,
  LinkButton,
  LoadError,
  Notice,
  readDraft,
  RefreshStatus,
  rules,
  Skeleton,
  TextArea,
  TextField,
  useDraft,
  useValidation,
  withoutRow,
  withRow,
} from '../ui.jsx'

// Everything site-wide that isn't a work, on one page (page pattern:
// Settings), in the order a visitor meets it: the brand in the header, the
// home page's opening text, then the ways to get in touch. Each section saves
// on its own, and keeps unsaved edits in this browser until it does.

const SECTIONS = [
  ['brand', 'Brand'],
  ['home-text', 'Home page text'],
  ['contact', 'Contact'],
]

export default function SiteSettings() {
  return (
    <>
      <AdminPageHeader title="Site settings">The name, pictures, home page text and contact details used across the site.</AdminPageHeader>

      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[12rem_minmax(0,44rem)] lg:items-start lg:gap-4">
        {/* Beside the sections and sticky on wide screens; a short list above them on narrow ones. */}
        <nav aria-label="Sections" className="lg:sticky lg:top-2">
          <ul className="flex flex-wrap gap-x-2 lg:flex-col">
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="inline-flex min-h-[2.75rem] items-center text-caption font-medium text-primary underline-offset-2 hover:underline">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col gap-4">
          <Brand />
          <HomeText />
          <Contact />
        </div>
      </div>
    </>
  )
}

function Section({ id, title, description, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-2 flex-col gap-2">
      <div>
        <h2 id={`${id}-title`} className="text-lead leading-[1.25] font-bold">{title}</h2>
        {description && <p className="max-w-[65ch] text-caption text-ink/65">{description}</p>}
      </div>
      {children}
    </section>
  )
}

// A save button with the line beside it that says how it went.
function SaveRow({ busy, label, state, dirty }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="submit" disabled={busy}>{busy ? 'Saving…' : label}</Button>
      <span role="status" className="text-caption text-ink/65">
        {state.tone === 'info' && state.text ? state.text : dirty ? 'Unsaved changes.' : ''}
      </span>
    </div>
  )
}

// A form's starting values: a kept draft if there is one, else what's saved.
function useInitial(key, saved) {
  const [draft] = useState(() => readDraft(key))
  return { initial: draft?.value ?? saved, draftAt: draft?.at ?? null }
}

// --- Brand ------------------------------------------------------------------

// An image left empty means the site uses the copy bundled with it, so nothing
// breaks if a setting is cleared.
const IMAGES = [
  ['logo', 'Logo', 'The mark in the site header.'],
  ['icon', 'Browser tab icon', 'A small square image.'],
  ['portrait', 'Portrait', 'The picture on the About page.'],
]

function Brand() {
  const { data: settings, error } = useApi(getSettings, [])
  const { data: library = [] } = useApi(() => listMedia({ kind: 'image' }), [])

  return (
    <Section id="brand" title="Brand" description="Leave an image empty to use the one that comes with the site.">
      {settings ? <BrandForm settings={settings} library={library} /> : error ? <LoadError what="brand settings" error={error} /> : <Skeleton rows={3} />}
    </Section>
  )
}

function BrandForm({ settings, library }) {
  const fromServer = {
    display_name: settings.display_name.value ?? '',
    ...Object.fromEntries(IMAGES.map(([key]) => [key, settings[key].mediaId])),
  }
  const { initial, draftAt } = useInitial('brand', fromServer)
  const [form, setForm] = useState(initial)
  const [saved, setSaved] = useState(fromServer)
  const [restoredAt, setRestoredAt] = useState(draftAt)
  const [state, setState] = useState({ tone: 'info', text: '' })
  const [busy, setBusy] = useState(false)
  const validation = useValidation({ display_name: rules.required('Enter the artist name; the header can’t be blank.') })
  const dirty = JSON.stringify(form) !== JSON.stringify(saved)
  useDraft('brand', form, dirty)

  const update = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    validation.clear(name)
    setState({ tone: 'info', text: '' })
  }

  async function save(event) {
    event.preventDefault()
    const first = validation.checkAll(form)
    if (first) return focusField(first)
    setBusy(true)
    try {
      await updateSettings({
        display_name: { value: form.display_name },
        ...Object.fromEntries(IMAGES.map(([key]) => [key, { mediaId: form[key] }])),
      })
      setSaved(form)
      setRestoredAt(null)
      setState({ tone: 'info', text: 'Saved.' })
    } catch (err) {
      if (err.field) validation.set(err.field, err.message)
      else setState({ tone: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-2 rounded-lg border border-ink/10 bg-surface p-2">
      <DraftNotice at={restoredAt} onDiscard={() => { clearDraft('brand'); setForm(saved); setRestoredAt(null) }} />
      <TextField
        label="Artist name"
        name="display_name"
        required
        hint="Shown in the header, the footer and the browser tab."
        value={form.display_name}
        onChange={(event) => update('display_name', event.target.value)}
        onBlur={validation.blur('display_name', form.display_name)}
        error={validation.errors.display_name}
      />
      {IMAGES.map(([key, label, hint]) => (
        <MediaField
          key={key}
          label={label}
          kind="image"
          hint={hint}
          mediaId={form[key]}
          library={library}
          error={validation.errors[key]}
          onChange={(media) => update(key, media?.id ?? null)}
        />
      ))}
      {state.tone === 'error' && <Notice tone="error">{state.text}</Notice>}
      <SaveRow busy={busy} label="Save brand" state={state} dirty={dirty} />
    </form>
  )
}

// --- Home page text -----------------------------------------------------------

// The pieces of text the public pages read, by the key they read them under.
// Only these do anything, so they're the only ones offered.
const HOME_TEXT = [
  ['home.hero.status', 'Availability', 'The short line at the top of the home page, like “Open for commissions”.', 1],
  ['home.hero.intro', 'Introduction', 'The paragraph under the name on the home page.', 4],
]

function HomeText() {
  const { data: entries, error } = useApi(listSiteText, [])
  return (
    <Section id="home-text" title="Home page text" description="Leave a field empty to use the text that comes with the site.">
      {entries ? <HomeTextForm entries={entries} /> : error ? <LoadError what="home page text" error={error} /> : <Skeleton rows={2} />}
    </Section>
  )
}

function HomeTextForm({ entries }) {
  const fromServer = Object.fromEntries(HOME_TEXT.map(([key]) => [key, entries.find((entry) => entry.key === key)?.value ?? '']))
  const { initial, draftAt } = useInitial('home-text', fromServer)
  const [form, setForm] = useState(initial)
  const [saved, setSaved] = useState(fromServer)
  const [restoredAt, setRestoredAt] = useState(draftAt)
  const [state, setState] = useState({ tone: 'info', text: '' })
  const [busy, setBusy] = useState(false)
  const dirty = JSON.stringify(form) !== JSON.stringify(saved)
  useDraft('home-text', form, dirty)

  async function save(event) {
    event.preventDefault()
    setBusy(true)
    try {
      for (const [key] of HOME_TEXT) if (form[key] !== saved[key]) await updateSiteText(key, form[key])
      setSaved(form)
      setRestoredAt(null)
      setState({ tone: 'info', text: 'Saved.' })
    } catch (err) {
      setState({ tone: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-2 rounded-lg border border-ink/10 bg-surface p-2">
      <DraftNotice at={restoredAt} onDiscard={() => { clearDraft('home-text'); setForm(saved); setRestoredAt(null) }} />
      {HOME_TEXT.map(([key, label, hint, rows]) => {
        const props = {
          label,
          hint,
          optional: true,
          value: form[key],
          onChange: (event) => { setForm((prev) => ({ ...prev, [key]: event.target.value })); setState({ tone: 'info', text: '' }) },
        }
        return rows === 1 ? <TextField key={key} {...props} /> : <TextArea key={key} rows={rows} {...props} />
      })}
      {state.tone === 'error' && <Notice tone="error">{state.text}</Notice>}
      <SaveRow busy={busy} label="Save text" state={state} dirty={dirty} />
    </form>
  )
}

// --- Contact ----------------------------------------------------------------

const linkRules = {
  platform: rules.required('Say which site the link is for, like instagram.'),
  url: (value) => (!String(value ?? '').trim() ? 'Paste the address of the profile.' : rules.https(value)),
}

function Contact() {
  const { data: settings } = useApi(getSettings, [])
  const linksApi = useApi(listSocialLinks, [])
  const { data: links, error } = linksApi
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState({ tone: 'info', text: '' })

  async function move(index, by) {
    const rows = [...links]
    ;[rows[index], rows[index + by]] = [rows[index + by], rows[index]]
    // Shown in the new order at once; put back if the save fails.
    linksApi.setData(rows)
    try {
      await reorderSocialLinks(rows.map((link) => link.id))
      setNotice({ tone: 'info', text: 'Saved the new order.' })
    } catch (err) {
      linksApi.reload()
      setNotice({ tone: 'error', text: err.message })
    }
  }

  async function confirmDelete() {
    setBusy(true)
    try {
      await deleteSocialLink(toDelete.id)
      linksApi.setData((rows) => withoutRow(rows, toDelete.id))
      clearDraft(`link-${toDelete.id}`)
      setNotice({ tone: 'info', text: `Removed the ${toDelete.platform} link.` })
    } catch (err) {
      setNotice({ tone: 'error', text: err.message })
    } finally {
      setBusy(false)
      setToDelete(null)
    }
  }

  return (
    <Section id="contact" title="Contact" description="Shown in the footer and on the About page: the email first, then the links in this order.">
      <div className="flex flex-col gap-2 rounded-lg border border-ink/10 bg-surface p-2">
        {settings && <EmailForm saved={settings.contact_email.value ?? ''} />}

        <div className="flex flex-col gap-1 border-t border-ink/10 pt-2">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h3 className="leading-[1.25] font-bold">Social links</h3>
            <RefreshStatus sources={[linksApi]} />
          </div>
          <Notice tone={notice.tone}>{notice.text}</Notice>
          {!links && (error ? <LoadError what="social links" error={error} /> : <Skeleton rows={2} />)}
          {links?.length === 0 && (
            <EmptyState title="No social links yet.">Links to Lui’s profiles show next to the email. Add the first one below.</EmptyState>
          )}
          {links?.length > 0 && (
            <ol className="flex flex-col divide-y divide-ink/10 rounded-sm border border-ink/10">
              {links.map((link, index) => (
                <LinkRow
                  key={link.id}
                  link={link}
                  isFirst={index === 0}
                  isLast={index === links.length - 1}
                  onMove={(by) => move(index, by)}
                  onDelete={() => setToDelete(link)}
                  onSaved={(saved) => linksApi.setData((rows) => withRow(rows, saved))}
                />
              ))}
            </ol>
          )}
          {links && <AddLink onAdded={(created) => linksApi.setData((rows) => withRow(rows, created))} />}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={`Remove the ${toDelete?.platform} link?`}
        confirmLabel={`Remove ${toDelete?.platform}`}
        busy={busy}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      >
        <p>It’s deleted for good. To keep it but take it off the site, untick “Shown on the site” instead.</p>
      </ConfirmDialog>
    </Section>
  )
}

function EmailForm({ saved: fromServer }) {
  const { initial, draftAt } = useInitial('contact-email', fromServer)
  const [email, setEmail] = useState(initial)
  const [saved, setSaved] = useState(fromServer)
  const [restoredAt, setRestoredAt] = useState(draftAt)
  const [state, setState] = useState({ tone: 'info', text: '' })
  const validation = useValidation({ email: rules.email })
  const dirty = email.trim() !== saved
  useDraft('contact-email', email, dirty)

  async function save(event) {
    event.preventDefault()
    if (validation.checkAll({ email })) return focusField('email')
    try {
      await updateSettings({ contact_email: { value: email } })
      setSaved(email.trim())
      setRestoredAt(null)
      setState({ tone: 'info', text: 'Saved.' })
    } catch (err) {
      validation.set('email', err.message)
    }
  }

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-2">
      <DraftNotice at={restoredAt} onDiscard={() => { clearDraft('contact-email'); setEmail(saved); setRestoredAt(null) }} />
      <TextField
        label="Contact email"
        name="email"
        type="email"
        required
        autoComplete="email"
        hint="Where the Contact buttons send messages."
        placeholder="name@example.com"
        value={email}
        onChange={(event) => { setEmail(event.target.value); validation.clear('email'); setState({ tone: 'info', text: '' }) }}
        onBlur={validation.blur('email', email)}
        error={validation.errors.email}
      />
      <SaveRow label="Save email" state={state} dirty={dirty} />
    </form>
  )
}

// The handle isn't shown on the site, so it isn't asked for; an existing one is
// left as it is.
function LinkRow({ link, isFirst, isLast, onMove, onDelete, onSaved }) {
  const key = `link-${link.id}`
  const fromServer = { platform: link.platform, url: link.url, visible: link.visible }
  const { initial } = useInitial(key, fromServer)
  const [form, setForm] = useState(initial)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const validation = useValidation(linkRules)
  const dirty = Object.keys(form).some((name) => form[name] !== link[name])
  useDraft(key, form, dirty)

  const update = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    validation.clear(name)
    setSaved(false)
    setError('')
  }

  async function save(event) {
    event.preventDefault()
    const first = validation.checkAll(form)
    if (first) return focusField(`${first}-${link.id}`)
    try {
      const updated = await updateSocialLink(link.id, form)
      onSaved(updated)
      setSaved(true)
    } catch (err) {
      if (err.field) validation.set(err.field, err.message)
      else setError(err.message)
    }
  }

  return (
    <li>
      <form onSubmit={save} noValidate className="flex flex-col gap-1 p-2">
        <div className="grid gap-2 md:grid-cols-[1fr_2fr]">
          <TextField label="Platform" name={`platform-${link.id}`} required placeholder="instagram" value={form.platform} onChange={(event) => update('platform', event.target.value)} onBlur={validation.blur('platform', form.platform)} error={validation.errors.platform} />
          <TextField label="Address" name={`url-${link.id}`} required type="url" placeholder="https://" value={form.url} onChange={(event) => update('url', event.target.value)} onBlur={validation.blur('url', form.url)} error={validation.errors.url} />
        </div>
        <Checkbox label="Shown on the site" checked={form.visible} onChange={(event) => update('visible', event.target.checked)} />
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-wrap items-center gap-x-2">
          <Button type="submit" variant="outline">Save link</Button>
          <span className="flex gap-1">
            <LinkButton disabled={isFirst} onClick={() => onMove(-1)} aria-label={`Move ${link.platform} up`}>Move up</LinkButton>
            <LinkButton disabled={isLast} onClick={() => onMove(1)} aria-label={`Move ${link.platform} down`}>Move down</LinkButton>
            <LinkButton onClick={onDelete} aria-label={`Remove ${link.platform}`}>Remove</LinkButton>
          </span>
          <span role="status" className="text-caption text-ink/65">{saved ? 'Saved.' : dirty ? 'Unsaved changes.' : ''}</span>
        </div>
      </form>
    </li>
  )
}

function AddLink({ onAdded }) {
  const blank = { platform: '', url: '', visible: true }
  const { initial } = useInitial('new-link', blank)
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const validation = useValidation(linkRules)
  useDraft('new-link', form, Boolean(form.platform.trim() || form.url.trim()))

  const update = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    validation.clear(name)
    setError('')
  }

  async function add(event) {
    event.preventDefault()
    const first = validation.checkAll(form)
    if (first) return focusField(`new-${first}`)
    try {
      const created = await createSocialLink(form)
      onAdded(created)
      setForm(blank)
    } catch (err) {
      if (err.field) validation.set(err.field, err.message)
      else setError(err.message)
    }
  }

  return (
    <form onSubmit={add} noValidate className="flex flex-col gap-2 rounded-sm border border-dashed border-ink/25 bg-bg p-2">
      <h4 className="leading-[1.25] font-bold">Add a link</h4>
      <div className="grid gap-2 md:grid-cols-[1fr_2fr]">
        <TextField label="Platform" name="new-platform" required placeholder="instagram" value={form.platform} onChange={(event) => update('platform', event.target.value)} onBlur={validation.blur('platform', form.platform)} error={validation.errors.platform} />
        <TextField label="Address" name="new-url" required type="url" placeholder="https://" value={form.url} onChange={(event) => update('url', event.target.value)} onBlur={validation.blur('url', form.url)} error={validation.errors.url} />
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <div>
        <Button type="submit">Add link</Button>
      </div>
    </form>
  )
}
