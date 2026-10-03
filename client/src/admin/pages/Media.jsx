import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { deleteMedia, formatBytes, listMedia, updateMedia, useApi } from '../../api/index.js'
import AdminPageHeader from '../AdminPageHeader.jsx'
import { AddMedia, MediaThumb, SOURCE_LABELS } from '../MediaPicker.jsx'
import { Button, ConfirmDialog, Dialog, EmptyState, LinkButton, ListToolbar, LoadError, Notice, PAGE_SIZE, Pager, RefreshStatus, ROW_INPUT, Skeleton, withoutRow } from '../ui.jsx'

// The asset library (page pattern: List, as a grid because it's pictures):
// everything the site uses, wherever it's stored. Filters live in the address
// so "Unused" can be linked to. Adding a file opens a slide-over, so the
// library stays in view.

const ROLE_LABELS = { cover: 'cover', gallery: 'gallery', model: '3D model', turntable: 'turntable', video: 'video', brand: 'brand' }
const KIND_OPTIONS = [['image', 'Images'], ['model', '3D models'], ['video', 'Videos']]

// How a file is named in words: its alt text, else what it is and where.
const nameOf = (media) => (media.altText ? `“${media.altText}”` : `this ${media.kind === 'model' ? '3D model' : media.kind} (${SOURCE_LABELS[media.source]})`)

export default function Media() {
  const [params, setParams] = useSearchParams()
  const kind = params.get('kind') || undefined
  const unused = params.get('unused') === '1'
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)

  const api = useApi(() => listMedia({ kind, unused }), [kind, unused])
  const { data: media, error } = api
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState({ tone: 'info', text: '' })

  // Search matches the alt text and the titles of the works using the file.
  const term = search.trim().toLowerCase()
  const found = media?.filter(
    (item) => !term || item.altText.toLowerCase().includes(term) || item.usedBy.some((use) => use.title?.toLowerCase().includes(term))
  )
  const shown = found?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const filtered = Boolean(kind || unused || term)

  function setFilter(name, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value)
    else next.delete(name)
    setParams(next, { replace: true })
    setPage(1)
  }

  function clearFilters() {
    setSearch('')
    setParams({}, { replace: true })
    setPage(1)
  }

  async function confirmDelete() {
    setBusy(true)
    try {
      await deleteMedia(toDelete.id)
      api.setData((rows) => withoutRow(rows, toDelete.id))
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
      <AdminPageHeader title="Media" status={<RefreshStatus sources={[api]} />} actions={<Button onClick={() => setAdding(true)}>Add file</Button>}>
        Every file the site uses. Describe images in their alt text, and remove files nothing uses.
      </AdminPageHeader>

      <ListToolbar
        search={search}
        onSearch={(value) => { setSearch(value); setPage(1) }}
        searchHint="Searches alt text and the works using each file."
        filters={[
          { name: 'kind', label: 'Type', options: KIND_OPTIONS },
          { name: 'unused', label: 'Only unused', checkbox: true },
        ]}
        values={{ kind, unused: unused ? '1' : '' }}
        onFilter={setFilter}
        onClearAll={clearFilters}
      />

      <div className="mb-2">
        <Notice tone={notice.tone}>{notice.text}</Notice>
      </div>

      {!media && (error ? <LoadError what="media library" error={error} /> : <Skeleton rows={4} />)}

      {found && (
        <div className="rounded-lg border border-ink/10 bg-surface">
          {found.length === 0 ? (
            filtered ? (
              <EmptyState title="No files match these filters." action={<Button variant="outline" onClick={clearFilters}>Clear all filters</Button>}>
                Try fewer filters or a shorter search.
              </EmptyState>
            ) : (
              <EmptyState title="The library is empty." action={<Button onClick={() => setAdding(true)}>Add file</Button>}>
                Upload images and .glb files, or link Drive images and YouTube videos, to use them on works.
              </EmptyState>
            )
          ) : (
            <ul className="grid gap-2 p-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {shown.map((item) => (
                <MediaCard key={item.id} media={item} onDelete={() => setToDelete(item)} />
              ))}
            </ul>
          )}
          <Pager page={page} total={found.length} onPage={setPage} noun="file" />
        </div>
      )}

      <Dialog open={adding} onClose={() => setAdding(false)} title="Add a file" side>
        <AddMedia
          heading="Upload or link"
          onAdded={(added) => {
            setAdding(false)
            // Newest first, like the list. Skipped if the filters would hide it.
            if (!added.duplicate && (!kind || added.kind === kind)) {
              api.setData((rows) => (rows && !rows.some((row) => row.id === added.id) ? [{ usedBy: [], ...added }, ...rows] : rows))
            }
            setNotice({ tone: 'info', text: added.duplicate ? 'That file is already in the library.' : 'Added. Describe it in its alt text below.' })
          }}
        />
      </Dialog>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={toDelete && `Remove ${nameOf(toDelete)}?`}
        confirmLabel="Remove file"
        busy={busy}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      >
        <p>
          {toDelete?.source === 'supabase'
            ? 'The uploaded file is deleted for good. No work uses it.'
            : 'Only the link is removed; the file stays where it is. No work uses it.'}
        </p>
      </ConfirmDialog>
    </>
  )
}

function MediaCard({ media, onDelete }) {
  const [alt, setAlt] = useState(media.altText)
  const [state, setState] = useState({ tone: 'info', text: '' })
  const cancelled = useRef(false)
  const usedBy = media.usedBy

  // Saves when you leave the field, if it changed. One field, so no form.
  // Enter saves; Escape puts the old text back.
  async function saveAlt() {
    if (cancelled.current) {
      cancelled.current = false
      return
    }
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
    <li className="flex flex-col gap-1 rounded-lg border border-ink/10 bg-surface p-2">
      <MediaThumb media={media} className="aspect-[4/3] w-full" />

      <p className="font-mono text-small text-ink/65 uppercase">
        {SOURCE_LABELS[media.source]} · {media.kind === 'model' ? '.glb' : media.kind}
        {media.bytes ? ` · ${formatBytes(media.bytes)}` : ''}
        {media.width ? ` · ${media.width}×${media.height}` : ''}
      </p>

      {media.kind !== 'model' && (
        <div className="flex flex-col gap-0.5">
          <label htmlFor={altId} className="text-caption font-medium">
            Alt text{!alt.trim() && <span className="font-normal text-ink/65"> · missing</span>}
          </label>
          <input
            id={altId}
            value={alt}
            onChange={(event) => { setAlt(event.target.value); setState({ tone: 'info', text: '' }) }}
            onBlur={saveAlt}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
              if (event.key === 'Escape') {
                cancelled.current = true
                setAlt(media.altText)
                event.currentTarget.blur()
              }
            }}
            className={ROW_INPUT + 'border-ink/25'}
          />
          {state.text && <p role={state.tone === 'error' ? 'alert' : 'status'} className="text-caption text-ink/65">{state.text}</p>}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-1 text-caption">
        {usedBy.length === 0 ? (
          <>
            <span className="text-ink/65">Not used anywhere</span>
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
                  <Link to="/admin/settings" className="text-primary underline-offset-2 hover:underline">Site settings</Link>
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
