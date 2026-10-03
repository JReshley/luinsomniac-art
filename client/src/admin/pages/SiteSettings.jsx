import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  createExperience,
  createSocialLink,
  deleteExperience,
  deleteSocialLink,
  getSettings,
  listExperience,
  listMedia,
  listSiteText,
  listSocialLinks,
  reorderExperience,
  reorderSocialLinks,
  updateExperience,
  updateSettings,
  updateSiteText,
  updateSocialLink,
  useApi,
} from '../../api/index.js'
import { DEFAULT_TEXT } from '../../data/siteText.js'
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
// Settings), grouped by where it shows: the brand across the site, then the
// home page, the About page, and the ways to get in touch. Each section saves
// on its own, and keeps unsaved edits in this browser until it does.
//
// The settings and the media library are loaded once here and shared, so the
// sections don't each ask for them.

const SECTIONS = [
  ['brand', 'Brand'],
  ['home-page', 'Home page'],
  ['about-page', 'About page'],
  ['contact', 'Contact'],
]

export default function SiteSettings() {
  const settingsApi = useApi(getSettings, [])
  const libraryApi = useApi(() => listMedia(), [])
  const textApi = useApi(listSiteText, [])
  const library = libraryApi.data ?? []
  const { hash } = useLocation()

  // A link from elsewhere ("Add the portrait →") names a section; go to it once
  // the sections have their content, so it lands in the right place.
  const ready = settingsApi.data !== undefined && textApi.data !== undefined
  // After the frame that draws them, so the router's own scroll-to-top on
  // navigation doesn't undo it.
  useEffect(() => {
    if (!ready || !hash) return
    const frame = requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }))
    return () => cancelAnimationFrame(frame)
  }, [ready, hash])

  return (
    <>
      <AdminPageHeader title="Site settings" status={<RefreshStatus sources={[settingsApi, libraryApi, textApi]} />}>
        The name, pictures, video, text and contact details used across the site.
      </AdminPageHeader>

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
          <Section id="brand" title="Brand" description="Used across the whole site. Leave an image empty to use the one that comes with the site.">
            <Loaded api={settingsApi} what="brand settings">{(settings) => <BrandForm settings={settings} library={library} />}</Loaded>
          </Section>

          <Section id="home-page" title="Home page" description="In the order they appear on the page. Clear a text field to go back to the site’s original text.">
            <Loaded api={settingsApi} also={textApi} what="home page settings">
              {(settings, entries) => <HomePageForm settings={settings} entries={entries} library={library} />}
            </Loaded>
          </Section>

          <Section id="about-page" title="About page" description="Clear a text field to go back to the site’s original text.">
            <Loaded api={settingsApi} also={textApi} what="About page settings">
              {(settings, entries) => <AboutPageForm settings={settings} entries={entries} library={library} />}
            </Loaded>
            <ExperienceList />
          </Section>

          <Contact settings={settingsApi.data} />
        </div>
      </div>
    </>
  )
}

// A section's form once its data is here: a skeleton until then, or what
// failed. `also` is a second source the form needs.
function Loaded({ api, also, what, children }) {
  const error = api.error ?? also?.error
  if (api.data === undefined || (also && also.data === undefined)) {
    return error ? <LoadError what={what} error={error} /> : <Skeleton rows={2} />
  }
  return children(api.data, also?.data)
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

// A piece of site text as the site shows it: the admin's if set, else the
// site's own (data/siteText.js). Forms start from this, so a field is never
// blank while the page shows words.
const textOf = (entries, key) => {
  const saved = entries.find((entry) => entry.key === key)?.value
  return saved?.trim() ? saved : DEFAULT_TEXT[key] ?? ''
}

// Saves the site-text fields that changed. A field saved as the site's own
// words, or cleared, is stored empty, so the site keeps following its default.
async function saveTexts(keys, form, saved) {
  for (const key of keys) {
    if (form[key] === saved[key]) continue
    const value = form[key].trim() === (DEFAULT_TEXT[key] ?? '').trim() ? '' : form[key]
    await updateSiteText(key, value)
  }
}

// One site-text field: a single line, or a box of `rows` lines.
function TextSetting({ f, name, label, hint, rows = 1 }) {
  const props = { label, hint, name, value: f.form[name], onChange: (event) => f.update(name, event.target.value) }
  return rows === 1 ? <TextField {...props} /> : <TextArea rows={rows} {...props} />
}

// The file a setting points at, or null. A setting added after this data was
// made has no row yet, which means the same.
const fileOf = (settings, key) => settings[key]?.mediaId ?? null

// The state every settings form here shares: the values (from a kept draft if
// there is one), what's saved, and the save status.
function useSettingsForm(draftKey, fromServer) {
  const { initial, draftAt } = useInitial(draftKey, fromServer)
  const [form, setForm] = useState(initial)
  const [saved, setSaved] = useState(fromServer)
  const [restoredAt, setRestoredAt] = useState(draftAt)
  const [state, setState] = useState({ tone: 'info', text: '' })
  const [busy, setBusy] = useState(false)
  const dirty = JSON.stringify(form) !== JSON.stringify(saved)
  useDraft(draftKey, form, dirty)

  return {
    form,
    dirty,
    busy,
    state,
    update(name, value) {
      setForm((prev) => ({ ...prev, [name]: value }))
      setState({ tone: 'info', text: '' })
    },
    // Runs the save; on success the form is clean and the kept draft is gone.
    // `onError` returns true when it has shown the error itself (under a field).
    async save(job, onError) {
      setBusy(true)
      try {
        await job(form, saved)
        setSaved(form)
        setRestoredAt(null)
        setState({ tone: 'info', text: 'Saved.' })
      } catch (err) {
        if (!onError?.(err)) setState({ tone: 'error', text: err.message })
      } finally {
        setBusy(false)
      }
    },
    draftNotice: <DraftNotice at={restoredAt} onDiscard={() => { clearDraft(draftKey); setForm(saved); setRestoredAt(null) }} />,
    errorNotice: state.tone === 'error' && <Notice tone="error">{state.text}</Notice>,
  }
}

// --- Brand ------------------------------------------------------------------

// An image left empty means the site uses the copy bundled with it, so nothing
// breaks if a setting is cleared.
const BRAND_IMAGES = [
  ['logo', 'Logo', 'The mark in the site header.'],
  ['icon', 'Browser tab icon', 'A small square image.'],
]

function BrandForm({ settings, library }) {
  const fromServer = {
    display_name: settings.display_name?.value ?? '',
    ...Object.fromEntries(BRAND_IMAGES.map(([key]) => [key, fileOf(settings, key)])),
  }
  const f = useSettingsForm('brand', fromServer)
  const validation = useValidation({ display_name: rules.required('Enter the artist name; the header can’t be blank.') })

  function submit(event) {
    event.preventDefault()
    const first = validation.checkAll(f.form)
    if (first) return focusField(first)
    f.save(
      (form) =>
        updateSettings({
          display_name: { value: form.display_name },
          ...Object.fromEntries(BRAND_IMAGES.map(([key]) => [key, { mediaId: form[key] }])),
        }),
      (err) => {
        if (!err.field) return false
        validation.set(err.field, err.message)
        return true
      }
    )
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-2 rounded-lg border border-ink/10 bg-surface p-2">
      {f.draftNotice}
      <TextField
        label="Artist name"
        name="display_name"
        required
        hint="Shown in the header, the footer and the browser tab."
        value={f.form.display_name}
        onChange={(event) => { f.update('display_name', event.target.value); validation.clear('display_name') }}
        onBlur={validation.blur('display_name', f.form.display_name)}
        error={validation.errors.display_name}
      />
      {BRAND_IMAGES.map(([key, label, hint]) => (
        <MediaField
          key={key}
          label={label}
          kind="image"
          hint={hint}
          mediaId={f.form[key]}
          library={library}
          error={validation.errors[key]}
          onChange={(media) => { f.update(key, media?.id ?? null); validation.clear(key) }}
        />
      ))}
      {f.errorNotice}
      <SaveRow busy={f.busy} label="Save brand" state={f.state} dirty={f.dirty} />
    </form>
  )
}

// --- Home page --------------------------------------------------------------

const HOME_TEXT_KEYS = ['home.hero.status', 'home.hero.intro', 'home.about']

function HomePageForm({ settings, entries, library }) {
  const fromServer = {
    ...Object.fromEntries(HOME_TEXT_KEYS.map((key) => [key, textOf(entries, key)])),
    home_reel: fileOf(settings, 'home_reel'),
  }
  const f = useSettingsForm('home-page', fromServer)
  const [reelError, setReelError] = useState('')

  function submit(event) {
    event.preventDefault()
    f.save(
      async (form, saved) => {
        await saveTexts(HOME_TEXT_KEYS, form, saved)
        if (form.home_reel !== saved.home_reel) await updateSettings({ home_reel: { mediaId: form.home_reel } })
      },
      (err) => {
        if (err.field !== 'home_reel') return false
        setReelError(err.message)
        return true
      }
    )
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-2 rounded-lg border border-ink/10 bg-surface p-2">
      {f.draftNotice}
      <TextSetting f={f} name="home.hero.status" label="Availability" hint="The short line at the very top, like “Open for commissions”." />
      <TextSetting f={f} name="home.hero.intro" label="Introduction" hint="The paragraph under the headline." rows={3} />
      <MediaField
        label="Prop samples video"
        kind="video"
        hint="The YouTube video in the Prop Samples section. Empty shows a placeholder there."
        mediaId={f.form.home_reel}
        library={library}
        error={reelError}
        onChange={(media) => { f.update('home_reel', media?.id ?? null); setReelError('') }}
      />
      <TextSetting f={f} name="home.about" label="About Lui summary" hint="The paragraph in the About Lui section near the end. The software list there comes from the About page." rows={3} />
      {f.errorNotice}
      <SaveRow busy={f.busy} label="Save home page" state={f.state} dirty={f.dirty} />
    </form>
  )
}

// --- About page -------------------------------------------------------------

const ABOUT_TEXT_KEYS = ['about.intro', 'about.body', 'about.software']

function AboutPageForm({ settings, entries, library }) {
  const fromServer = {
    portrait: fileOf(settings, 'portrait'),
    ...Object.fromEntries(ABOUT_TEXT_KEYS.map((key) => [key, textOf(entries, key)])),
  }
  const f = useSettingsForm('about-page', fromServer)
  const [portraitError, setPortraitError] = useState('')

  function submit(event) {
    event.preventDefault()
    f.save(
      async (form, saved) => {
        if (form.portrait !== saved.portrait) await updateSettings({ portrait: { mediaId: form.portrait } })
        await saveTexts(ABOUT_TEXT_KEYS, form, saved)
      },
      (err) => {
        if (err.field !== 'portrait') return false
        setPortraitError(err.message)
        return true
      }
    )
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-2 rounded-lg border border-ink/10 bg-surface p-2">
      {f.draftNotice}
      <MediaField
        label="Portrait"
        kind="image"
        hint="The picture of Lui here and in the About Lui section of the home page. Empty shows a placeholder."
        mediaId={f.form.portrait}
        library={library}
        error={portraitError}
        onChange={(media) => { f.update('portrait', media?.id ?? null); setPortraitError('') }}
      />
      <TextSetting f={f} name="about.intro" label="Introduction" hint="The large first paragraph." rows={3} />
      <TextSetting f={f} name="about.body" label="More about Lui" hint="The smaller paragraph under it." rows={4} />
      <TextSetting
        f={f}
        name="about.software"
        label="Software"
        hint="Separate with commas, in the order to show them. Also listed in the home page’s About Lui section."
      />
      {f.errorNotice}
      <SaveRow busy={f.busy} label="Save About page" state={f.state} dirty={f.dirty} />
    </form>
  )
}

// The "Selected experience" rows, in order: edited, reordered and removed one
// at a time, like the social links. An empty list hides the section on the site.
const experienceRules = {
  years: rules.required('Enter the years, like 2024—2025 or 2025—now.'),
  role: rules.required('Enter the role or what it was, like Freelance 3D artist.'),
}

function ExperienceList() {
  const api = useApi(listExperience, [])
  const { data: rows, error } = api
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState({ tone: 'info', text: '' })

  async function move(index, by) {
    const next = [...rows]
    ;[next[index], next[index + by]] = [next[index + by], next[index]]
    // Shown in the new order at once; put back if the save fails.
    api.setData(next)
    try {
      await reorderExperience(next.map((row) => row.id))
      setNotice({ tone: 'info', text: 'Saved the new order.' })
    } catch (err) {
      api.reload()
      setNotice({ tone: 'error', text: err.message })
    }
  }

  async function confirmDelete() {
    setBusy(true)
    try {
      await deleteExperience(toDelete.id)
      api.setData((list) => withoutRow(list, toDelete.id))
      clearDraft(`experience-${toDelete.id}`)
      setNotice({ tone: 'info', text: `Removed “${toDelete.role}”.` })
    } catch (err) {
      setNotice({ tone: 'error', text: err.message })
    } finally {
      setBusy(false)
      setToDelete(null)
    }
  }

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-ink/10 bg-surface p-2">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h3 className="leading-[1.25] font-bold">Selected experience</h3>
        <RefreshStatus sources={[api]} />
      </div>
      <p className="text-caption text-ink/65">Newest first is usual. Each row saves on its own.</p>
      <Notice tone={notice.tone}>{notice.text}</Notice>
      {!rows && (error ? <LoadError what="experience" error={error} /> : <Skeleton rows={2} />)}
      {rows?.length === 0 && (
        <EmptyState title="No experience yet.">The section is hidden on the About page until there’s at least one. Add the first below.</EmptyState>
      )}
      {rows?.length > 0 && (
        <ol className="flex flex-col divide-y divide-ink/10 rounded-sm border border-ink/10">
          {rows.map((row, index) => (
            <ExperienceRow
              key={row.id}
              row={row}
              isFirst={index === 0}
              isLast={index === rows.length - 1}
              onMove={(by) => move(index, by)}
              onDelete={() => setToDelete(row)}
              onSaved={(saved) => api.setData((list) => withRow(list, saved))}
            />
          ))}
        </ol>
      )}
      {rows && <AddExperience onAdded={(created) => api.setData((list) => withRow(list, created))} />}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={`Remove “${toDelete?.role}”?`}
        confirmLabel={`Remove “${toDelete?.role}”`}
        busy={busy}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      >
        <p>It comes off the About page and is deleted for good.</p>
      </ConfirmDialog>
    </div>
  )
}

// The three fields of an experience row, shared by editing and adding.
function ExperienceFields({ prefix, form, update, validation }) {
  const field = (name) => ({
    name: `${prefix}-${name}`,
    value: form[name],
    onChange: (event) => update(name, event.target.value),
    onBlur: experienceRules[name] ? validation.blur(name, form[name]) : undefined,
    error: validation.errors[name],
  })
  return (
    <>
      <div className="grid gap-2 md:grid-cols-[10rem_1fr]">
        <TextField label="Years" required placeholder="2024—2025" {...field('years')} />
        <TextField label="Role" required placeholder="Freelance 3D artist" {...field('role')} />
      </div>
      <TextField label="Detail" optional hint="One short line under the role." {...field('detail')} />
    </>
  )
}

function ExperienceRow({ row, isFirst, isLast, onMove, onDelete, onSaved }) {
  const key = `experience-${row.id}`
  const fromServer = { years: row.years, role: row.role, detail: row.detail }
  const { initial } = useInitial(key, fromServer)
  const [form, setForm] = useState(initial)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const validation = useValidation(experienceRules)
  const dirty = Object.keys(form).some((name) => form[name] !== row[name])
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
    if (first) return focusField(`${row.id}-${first}`)
    try {
      onSaved(await updateExperience(row.id, form))
      setSaved(true)
    } catch (err) {
      if (err.field) validation.set(err.field, err.message)
      else setError(err.message)
    }
  }

  return (
    <li>
      <form onSubmit={save} noValidate className="flex flex-col gap-1 p-2">
        <ExperienceFields prefix={row.id} form={form} update={update} validation={validation} />
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-wrap items-center gap-x-2">
          <Button type="submit" variant="outline">Save experience</Button>
          <span className="flex gap-1">
            <LinkButton disabled={isFirst} onClick={() => onMove(-1)} aria-label={`Move ${row.role} up`}>Move up</LinkButton>
            <LinkButton disabled={isLast} onClick={() => onMove(1)} aria-label={`Move ${row.role} down`}>Move down</LinkButton>
            <LinkButton onClick={onDelete} aria-label={`Remove ${row.role}`}>Remove</LinkButton>
          </span>
          <span role="status" className="text-caption text-ink/65">{saved ? 'Saved.' : dirty ? 'Unsaved changes.' : ''}</span>
        </div>
      </form>
    </li>
  )
}

function AddExperience({ onAdded }) {
  const blank = { years: '', role: '', detail: '' }
  const { initial } = useInitial('new-experience', blank)
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const validation = useValidation(experienceRules)
  useDraft('new-experience', form, Boolean(form.years.trim() || form.role.trim() || form.detail.trim()))

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
      onAdded(await createExperience(form))
      setForm(blank)
    } catch (err) {
      if (err.field) validation.set(err.field, err.message)
      else setError(err.message)
    }
  }

  return (
    <form onSubmit={add} noValidate className="flex flex-col gap-2 rounded-sm border border-dashed border-ink/25 bg-bg p-2">
      <h4 className="leading-[1.25] font-bold">Add experience</h4>
      <ExperienceFields prefix="new" form={form} update={update} validation={validation} />
      {error && <Notice tone="error">{error}</Notice>}
      <div>
        <Button type="submit">Add experience</Button>
      </div>
      <p className="text-caption text-ink/65">New rows go at the end; move them up if they’re newer.</p>
    </form>
  )
}

// --- Contact ----------------------------------------------------------------

const linkRules = {
  platform: rules.required('Say which site the link is for, like instagram.'),
  url: (value) => (!String(value ?? '').trim() ? 'Paste the address of the profile.' : rules.https(value)),
}

function Contact({ settings }) {
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
        {settings && <EmailForm saved={settings.contact_email?.value ?? ''} />}

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
