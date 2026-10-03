import { useState } from 'react'
import Button from '../../components/Button.jsx'
import { getSettings, listMedia, updateSettings, useApi } from '../../api/index.js'
import AdminPageHeader from '../AdminPageHeader.jsx'
import { MediaField } from '../MediaPicker.jsx'
import { Notice, TextField } from '../ui.jsx'

// The name and the three images that make up the brand. An image left empty
// means the site uses the copy bundled with it, so nothing breaks if a
// setting is cleared.

const IMAGES = [
  ['logo', 'Logo', 'The mark in the site header.'],
  ['icon', 'Icon', 'The small square in browser tabs.'],
  ['portrait', 'Portrait', 'The picture on the About page.'],
]

export default function Brand() {
  const { data: settings, error } = useApi(getSettings, [])
  const { data: library = [] } = useApi(() => listMedia({ kind: 'image' }), [])

  if (!settings) {
    return (
      <>
        <AdminPageHeader title="Brand" />
        {error && <p role="alert" className="text-ink/80">The brand settings couldn’t load. {error.message} Reload the page to try again.</p>}
      </>
    )
  }

  return (
    <>
      <AdminPageHeader title="Brand">The logo, icon, portrait and display name.</AdminPageHeader>
      <BrandForm settings={settings} library={library} />
    </>
  )
}

function BrandForm({ settings, library }) {
  const initial = () => ({
    display_name: settings.display_name.value ?? '',
    ...Object.fromEntries(IMAGES.map(([key]) => [key, settings[key].mediaId])),
  })
  const [form, setForm] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [state, setState] = useState({ tone: 'info', text: '', field: null })
  const [busy, setBusy] = useState(false)
  const dirty = JSON.stringify(form) !== JSON.stringify(saved)
  const update = (patch) => { setForm((prev) => ({ ...prev, ...patch })); setState({ tone: 'info', text: '', field: null }) }
  const errorFor = (name) => (state.tone === 'error' && state.field === name ? state.text : undefined)

  async function save(event) {
    event.preventDefault()
    setBusy(true)
    try {
      await updateSettings({
        display_name: { value: form.display_name },
        ...Object.fromEntries(IMAGES.map(([key]) => [key, { mediaId: form[key] }])),
      })
      setSaved(form)
      setState({ tone: 'info', text: 'Saved.', field: null })
    } catch (err) {
      setState({ tone: 'error', text: err.message, field: err.field })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} noValidate className="flex max-w-[40rem] flex-col gap-2">
      <section className="flex flex-col gap-1.5 rounded-lg border border-ink/10 bg-surface p-2">
        <TextField label="Display name" hint="The artist name shown in the header and footer." value={form.display_name} onChange={(event) => update({ display_name: event.target.value })} error={errorFor('display_name')} />
      </section>

      <section className="flex flex-col gap-2 rounded-lg border border-ink/10 bg-surface p-2">
        {IMAGES.map(([key, label, hint]) => (
          <MediaField
            key={key}
            label={label}
            kind="image"
            hint={`${hint} Empty uses the one bundled with the site.`}
            mediaId={form[key]}
            library={library}
            error={errorFor(key)}
            onChange={(media) => update({ [key]: media?.id ?? null })}
          />
        ))}
      </section>

      {state.tone === 'error' && !state.field && <Notice tone="error">{state.text}</Notice>}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={busy || !dirty}>{busy ? 'Saving…' : 'Save brand'}</Button>
        <span role="status" className="text-caption text-ink/65">{state.tone === 'info' && state.text ? state.text : dirty ? 'Unsaved changes.' : ''}</span>
      </div>
    </form>
  )
}
