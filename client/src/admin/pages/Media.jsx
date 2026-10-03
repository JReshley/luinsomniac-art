import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { deleteMedia, formatBytes, listMedia, updateMedia, useApi } from '../../api/index.js'
import AdminPageHeader from '../AdminPageHeader.jsx'
import { AddMedia, MediaThumb, SOURCE_LABELS } from '../MediaPicker.jsx'
import { ConfirmDialog, LinkButton, Notice, SelectField } from '../ui.jsx'

// The asset library: everything the site uses, wherever it's stored. Filters
// live in the address so "Unused" can be linked to.

const ROLE_LABELS = { cover: 'cover', gallery: 'gallery', model: '3D model', turntable: 'turntable', video: 'video', brand: 'brand' }

export default function Media() {
  const [params, setParams] = useSearchParams()
  const kind = params.get('kind') || undefined
  const source = params.get('source') || undefined
  const unused = params.get('unused') === '1'

  const { data: media, error } = useApi(() => listMedia({ kind, source, unused }), [kind, source, unused])
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState({ tone: 'info', text: '' })

  function setFilter(name, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value)
    else next.delete(name)
    setParams(next, { replace: true })
  }

  async function confirmDelete() {
    setBusy(true)
    try {
      await deleteMedia(toDelete.id)
      setNotice({ tone: 'info', text: 'Removed the file.' })
    } catch (err) {
      setNotice({ tone: 'error', text: err.message })
    } finally {
      setBusy(false)
      setToDelete(null)
    }
  }

  return (
    <>
      <AdminPageHeader title="Media">
        Upload files, paste a Drive or YouTube link, and find files nothing uses.
      </AdminPageHeader>

      <div className="mb-3">
        <AddMedia heading="Add a file" onAdded={(added) => setNotice({ tone: 'info', text: added.duplicate ? 'That file is already in the library.' : 'Added to the library.' })} />
      </div>

      <div className="mb-2 grid gap-1.5 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <SelectField label="Type" value={kind ?? ''} onChange={(event) => setFilter('kind', event.target.value)}>
          <option value="">All types</option>
          <option value="image">Images</option>
          <option value="model">3D models</option>
          <option value="video">Videos</option>
        </SelectField>
        <SelectField label="Stored in" value={source ?? ''} onChange={(event) => setFilter('source', event.target.value)}>
          <option value="">Anywhere</option>
          {Object.entries(SOURCE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </SelectField>
        <label className="flex cursor-pointer items-center gap-1 py-1">
          <input type="checkbox" className="size-2 cursor-pointer accent-primary" checked={unused} onChange={(event) => setFilter('unused', event.target.checked ? '1' : '')} />
          <span className="text-caption">Only unused</span>
        </label>
      </div>

      <div className="mb-2">
        <Notice tone={notice.tone}>{notice.text}</Notice>
      </div>

      {error && !media && <p role="alert" className="text-ink/80">The library couldn’t load. {error.message} Reload the page to try again.</p>}

      {media && media.length === 0 && (
        <p className="rounded-lg border border-ink/10 bg-surface p-3 font-medium">
          {kind || source || unused ? 'No files match those filters.' : 'The library is empty. Upload an image or paste a link above.'}
        </p>
      )}

      {media && media.length > 0 && (
        <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {media.map((item) => (
            <MediaCard key={item.id} media={item} onDelete={() => setToDelete(item)} />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Remove this file?"
        confirmLabel="Remove file"
        busy={busy}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      >
        <p>
          {toDelete?.source === 'supabase'
            ? 'The uploaded file is deleted for good. Nothing uses it.'
            : 'Only the link is removed; the file stays where it is. Nothing uses it.'}
        </p>
      </ConfirmDialog>
    </>
  )
}

function MediaCard({ media, onDelete }) {
  const [alt, setAlt] = useState(media.altText)
  const [state, setState] = useState({ tone: 'info', text: '' })
  const usedBy = media.usedBy

  // Saves when you leave the field, if it changed. One field, so no form.
  async function saveAlt() {
    if (alt.trim() === media.altText) return
    try {
      await updateMedia(media.id, { altText: alt })
      setState({ tone: 'info', text: 'Saved.' })
    } catch (err) {
      setState({ tone: 'error', text: err.message })
    }
  }

  const altId = `alt-${media.id}`
  return (
    <li className="flex flex-col gap-1 rounded-lg border border-ink/10 bg-surface p-1.5">
      <MediaThumb media={media} className="aspect-[4/3] w-full" />

      <p className="font-mono text-small text-ink/65 uppercase">
        {SOURCE_LABELS[media.source]} · {media.kind === 'model' ? '.glb' : media.kind}
        {media.bytes ? ` · ${formatBytes(media.bytes)}` : ''}
        {media.width ? ` · ${media.width}×${media.height}` : ''}
      </p>

      {media.kind !== 'model' && (
        <div className="flex flex-col gap-0.5">
          <label htmlFor={altId} className="text-small font-medium">Alt text</label>
          <input
            id={altId}
            value={alt}
            onChange={(event) => { setAlt(event.target.value); setState({ tone: 'info', text: '' }) }}
            onBlur={saveAlt}
            className="rounded-sm border border-ink/25 bg-surface px-1 py-0.5 text-caption hover:border-ink/45 focus-visible:border-primary"
          />
          {state.text && <p role={state.tone === 'error' ? 'alert' : 'status'} className="text-small">{state.text}</p>}
        </div>
      )}

      <div className="mt-auto flex items-end justify-between gap-1 text-caption">
        {usedBy.length === 0 ? (
          <>
            <span className="text-ink/65">Unused</span>
            <LinkButton onClick={onDelete}>Remove</LinkButton>
          </>
        ) : (
          <p className="text-ink/65">
            Used by{' '}
            {usedBy.map((use, i) => (
              <span key={`${use.workId ?? use.setting}-${use.role}`}>
                {i > 0 && ', '}
                {use.workId ? (
                  <Link to={`/admin/works/${use.workId}`} className="text-primary underline-offset-2 hover:underline">{use.title}</Link>
                ) : (
                  <Link to="/admin/brand" className="text-primary underline-offset-2 hover:underline">Brand</Link>
                )}{' '}
                ({ROLE_LABELS[use.role]})
              </span>
            ))}
          </p>
        )}
      </div>
    </li>
  )
}
