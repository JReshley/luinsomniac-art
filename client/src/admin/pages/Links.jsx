import { useState } from 'react'
import Button from '../../components/Button.jsx'
import {
  createSocialLink,
  deleteSocialLink,
  getSettings,
  listSocialLinks,
  reorderSocialLinks,
  updateSettings,
  updateSocialLink,
  useApi,
} from '../../api/index.js'
import AdminPageHeader from '../AdminPageHeader.jsx'
import { Checkbox, ConfirmDialog, LinkButton, Notice, TextField } from '../ui.jsx'

// Social links and the contact email. A hidden link is kept but not shown on
// the site; removing one deletes it.

export default function Links() {
  const { data: links, error } = useApi(listSocialLinks, [])
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState({ tone: 'info', text: '' })

  async function move(index, by) {
    const ids = links.map((link) => link.id)
    ;[ids[index], ids[index + by]] = [ids[index + by], ids[index]]
    try {
      await reorderSocialLinks(ids)
      setNotice({ tone: 'info', text: 'Saved the new order.' })
    } catch (err) {
      setNotice({ tone: 'error', text: err.message })
    }
  }

  async function confirmDelete() {
    setBusy(true)
    try {
      await deleteSocialLink(toDelete.id)
      setNotice({ tone: 'info', text: `Removed the ${toDelete.platform} link.` })
    } catch (err) {
      setNotice({ tone: 'error', text: err.message })
    } finally {
      setBusy(false)
      setToDelete(null)
    }
  }

  return (
    <>
      <AdminPageHeader title="Links">Social links and the contact email.</AdminPageHeader>

      <div className="flex max-w-[44rem] flex-col gap-3">
        <ContactEmail />

        <section className="flex flex-col gap-1.5">
          <h2 className="font-bold">Social links</h2>
          <Notice tone={notice.tone}>{notice.text}</Notice>
          {error && !links && <p role="alert" className="text-ink/80">The links couldn’t load. {error.message} Reload the page to try again.</p>}
          {links?.map((link, index) => (
            <LinkRow
              key={link.id}
              link={link}
              isFirst={index === 0}
              isLast={index === links.length - 1}
              onMove={(by) => move(index, by)}
              onDelete={() => setToDelete(link)}
            />
          ))}
          <AddLink />
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={`Remove the ${toDelete?.platform} link?`}
        confirmLabel={`Remove ${toDelete?.platform}`}
        busy={busy}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      >
        <p>It’s deleted, not archived. To keep it but take it off the site, hide it instead.</p>
      </ConfirmDialog>
    </>
  )
}

function ContactEmail() {
  const { data: settings } = useApi(getSettings, [])
  if (!settings) return null
  return <EmailForm saved={settings.contact_email.value} />
}

function EmailForm({ saved }) {
  const [email, setEmail] = useState(saved ?? '')
  const [state, setState] = useState({ tone: 'info', text: '' })

  async function save(event) {
    event.preventDefault()
    try {
      await updateSettings({ contact_email: { value: email } })
      setState({ tone: 'info', text: 'Saved.' })
    } catch (err) {
      setState({ tone: 'error', text: err.message })
    }
  }

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-1.5 rounded-lg border border-ink/10 bg-surface p-2">
      <TextField
        label="Contact email"
        type="email"
        hint="Where the Contact buttons send messages."
        value={email}
        onChange={(event) => { setEmail(event.target.value); setState({ tone: 'info', text: '' }) }}
        error={state.tone === 'error' ? state.text : undefined}
      />
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={email.trim() === (saved ?? '')}>Save email</Button>
        {state.tone === 'info' && <span role="status" className="text-caption text-ink/65">{state.text}</span>}
      </div>
    </form>
  )
}

function LinkRow({ link, isFirst, isLast, onMove, onDelete }) {
  const [form, setForm] = useState({ platform: link.platform, handle: link.handle, url: link.url, visible: link.visible })
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const dirty = Object.keys(form).some((name) => form[name] !== link[name])
  const update = (patch) => { setForm((prev) => ({ ...prev, ...patch })); setSaved(false); setError(null) }
  const errorFor = (name) => (error?.field === name ? error.message : undefined)

  async function save(event) {
    event.preventDefault()
    try {
      await updateSocialLink(link.id, form)
      setSaved(true)
    } catch (err) {
      setError(err)
    }
  }

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-1.5 rounded-lg border border-ink/10 bg-surface p-2">
      <div className="grid gap-1.5 md:grid-cols-[1fr_1fr_2fr]">
        <TextField label="Site" hint="Like instagram" value={form.platform} onChange={(event) => update({ platform: event.target.value })} error={errorFor('platform')} />
        <TextField label="Handle" value={form.handle} onChange={(event) => update({ handle: event.target.value })} />
        <TextField label="Address" type="url" value={form.url} onChange={(event) => update({ url: event.target.value })} error={errorFor('url')} />
      </div>
      <Checkbox label="Shown on the site" checked={form.visible} onChange={(event) => update({ visible: event.target.checked })} />
      {error && !error.field && <Notice tone="error">{error.message}</Notice>}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={!dirty}>Save</Button>
        <span className="flex gap-1">
          <LinkButton disabled={isFirst} onClick={() => onMove(-1)} aria-label={`Move ${link.platform} up`}>Up</LinkButton>
          <LinkButton disabled={isLast} onClick={() => onMove(1)} aria-label={`Move ${link.platform} down`}>Down</LinkButton>
          <LinkButton onClick={onDelete} aria-label={`Remove ${link.platform}`}>Remove</LinkButton>
        </span>
        <span role="status" className="text-caption text-ink/65">{saved ? 'Saved.' : dirty ? 'Unsaved changes.' : ''}</span>
      </div>
    </form>
  )
}

function AddLink() {
  const blank = { platform: '', handle: '', url: '', visible: true }
  const [form, setForm] = useState(blank)
  const [error, setError] = useState(null)
  const update = (patch) => { setForm((prev) => ({ ...prev, ...patch })); setError(null) }
  const errorFor = (name) => (error?.field === name ? error.message : undefined)

  async function add(event) {
    event.preventDefault()
    try {
      await createSocialLink(form)
      setForm(blank)
    } catch (err) {
      setError(err)
    }
  }

  return (
    <form onSubmit={add} noValidate className="flex flex-col gap-1.5 rounded-lg border border-ink/10 bg-bg p-2">
      <h3 className="font-bold">Add a link</h3>
      <div className="grid gap-1.5 md:grid-cols-[1fr_1fr_2fr]">
        <TextField label="Site" hint="Like instagram" value={form.platform} onChange={(event) => update({ platform: event.target.value })} error={errorFor('platform')} />
        <TextField label="Handle" value={form.handle} onChange={(event) => update({ handle: event.target.value })} />
        <TextField label="Address" type="url" placeholder="https://" value={form.url} onChange={(event) => update({ url: event.target.value })} error={errorFor('url')} />
      </div>
      <div>
        <Button type="submit" disabled={!form.platform.trim() || !form.url.trim()}>Add link</Button>
      </div>
    </form>
  )
}
