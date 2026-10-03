import { useState } from 'react'
import Button from '../../components/Button.jsx'
import { listSiteText, updateSiteText, useApi } from '../../api/index.js'
import AdminPageHeader from '../AdminPageHeader.jsx'
import { Notice, TextArea, TextField } from '../ui.jsx'

// The headings and paragraphs on the public pages, each under a key that says
// where it appears ("home.hero.intro"). Each entry saves on its own.

export default function SiteText() {
  const { data: entries, error } = useApi(listSiteText, [])
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [addError, setAddError] = useState(null)

  async function add(event) {
    event.preventDefault()
    setAddError(null)
    try {
      await updateSiteText(newKey.trim(), newValue)
      setNewKey('')
      setNewValue('')
    } catch (err) {
      setAddError(err)
    }
  }

  return (
    <>
      <AdminPageHeader title="Site text">The headings and paragraphs on the public pages.</AdminPageHeader>

      {error && !entries && <p role="alert" className="text-ink/80">The text couldn’t load. {error.message} Reload the page to try again.</p>}

      <div className="flex max-w-[44rem] flex-col gap-3">
        {entries?.length === 0 && <p className="text-ink/65">No text entries yet.</p>}
        {entries?.map((entry) => <TextEntry key={entry.key} entry={entry} />)}

        <form onSubmit={add} noValidate className="flex flex-col gap-1.5 rounded-lg border border-ink/10 bg-bg p-2">
          <h2 className="font-bold">Add a text</h2>
          <TextField
            label="Key"
            hint="Where it appears, in lowercase words joined by dots, like “about.intro”. The page has to read this key before it shows anything."
            value={newKey}
            onChange={(event) => { setNewKey(event.target.value); setAddError(null) }}
            error={addError?.field === 'key' ? addError.message : undefined}
          />
          <TextArea label="Text" rows={3} value={newValue} onChange={(event) => setNewValue(event.target.value)} />
          {addError && addError.field !== 'key' && <Notice tone="error">{addError.message}</Notice>}
          <div>
            <Button type="submit" disabled={!newKey.trim()}>Add text</Button>
          </div>
        </form>
      </div>
    </>
  )
}

function TextEntry({ entry }) {
  const [value, setValue] = useState(entry.value)
  const [state, setState] = useState({ tone: 'info', text: '' })
  const [busy, setBusy] = useState(false)
  const dirty = value !== entry.value

  async function save(event) {
    event.preventDefault()
    setBusy(true)
    try {
      await updateSiteText(entry.key, value)
      setState({ tone: 'info', text: 'Saved.' })
    } catch (err) {
      setState({ tone: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-1 rounded-lg border border-ink/10 bg-surface p-2">
      <TextArea
        label={<span className="font-mono">{entry.key}</span>}
        rows={Math.min(8, Math.max(2, Math.ceil(value.length / 70)))}
        value={value}
        onChange={(event) => { setValue(event.target.value); setState({ tone: 'info', text: '' }) }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={busy || !dirty}>{busy ? 'Saving…' : 'Save'}</Button>
        <span role="status" className="text-caption text-ink/65">
          {state.text || (dirty ? 'Unsaved changes.' : entry.updatedByName ? `Last edited by ${entry.updatedByName}` : '')}
        </span>
      </div>
      {state.tone === 'error' && <Notice tone="error">{state.text}</Notice>}
    </form>
  )
}
