import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Button from '../../components/Button.jsx'
import { archiveWork, listCategories, listWorks, setWorkStatus, STATUSES, useApi } from '../../api/index.js'
import AdminPageHeader from '../AdminPageHeader.jsx'
import { MediaThumb } from '../MediaPicker.jsx'
import { ConfirmDialog, KIND_LABELS, LinkButton, Notice, SelectField, StatusBadge, TextField } from '../ui.jsx'

// All works in one list. The tabs and the status filter live in the address
// (?kind=model&status=draft), so a dashboard link, a bookmark and the back
// button all land on the same view.

const TABS = [
  { label: 'All', kind: null },
  { label: 'Artworks', kind: 'artwork' },
  { label: '3D models', kind: 'model' },
  { label: 'Videos', kind: 'video' },
]

export default function Works() {
  const [params, setParams] = useSearchParams()
  const kind = params.get('kind') || undefined
  const status = params.get('status') || undefined
  const categoryId = params.get('category') || undefined
  const attention = params.get('attention') === '1'
  const [search, setSearch] = useState('')
  const [toArchive, setToArchive] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState({ tone: 'info', text: '' })

  const { data: works, error } = useApi(() => listWorks({ kind, status, categoryId, attention, search }), [kind, status, categoryId, attention, search])
  const { data: categories } = useApi(listCategories, [])

  function setFilter(name, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value)
    else next.delete(name)
    setParams(next, { replace: true })
  }

  const tabHref = (tabKind) => {
    const next = new URLSearchParams(params)
    if (tabKind) next.set('kind', tabKind)
    else next.delete('kind')
    return `?${next}`
  }

  async function run(job, success) {
    setBusy(true)
    setNotice({ tone: 'info', text: '' })
    try {
      await job()
      setNotice({ tone: 'info', text: success })
    } catch (err) {
      setNotice({ tone: 'error', text: err.message })
    } finally {
      setBusy(false)
      setToArchive(null)
    }
  }

  const filtered = Boolean(status || categoryId || attention || search.trim())

  return (
    <>
      <AdminPageHeader
        title="Works"
        actions={
          <>
            <Button href="/admin/works/new?kind=artwork" viewTransition={false}>New artwork</Button>
            <Button href="/admin/works/new?kind=model" variant="outline" viewTransition={false}>New 3D model</Button>
            <Button href="/admin/works/new?kind=video" variant="outline" viewTransition={false}>New video</Button>
          </>
        }
      >
        Every artwork, 3D model and video on the site.
      </AdminPageHeader>

      <nav aria-label="Kind of work" className="mb-2 flex flex-wrap gap-1">
        {TABS.map((tab) => {
          const current = (tab.kind ?? undefined) === kind
          return (
            <Link
              key={tab.label}
              to={tabHref(tab.kind)}
              replace
              aria-current={current ? 'page' : undefined}
              className={`rounded-full border px-1.5 py-0.5 text-caption font-medium no-underline ${
                current ? 'border-primary bg-primary text-surface' : 'border-ink/25 text-ink hover:bg-ink/5'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>

      <div className="mb-2 grid gap-1.5 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
        <TextField label="Search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} hint="Title, slug or tag" />
        <SelectField label="Status" value={status ?? ''} onChange={(event) => setFilter('status', event.target.value)}>
          <option value="">Not archived</option>
          {STATUSES.map((item) => (
            <option key={item} value={item}>
              {item[0].toUpperCase() + item.slice(1)}
            </option>
          ))}
        </SelectField>
        <SelectField label="Category" value={categoryId ?? ''} onChange={(event) => setFilter('category', event.target.value)}>
          <option value="">All categories</option>
          {categories?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </SelectField>
        <label className="flex cursor-pointer items-center gap-1 py-1">
          <input type="checkbox" className="size-2 cursor-pointer accent-primary" checked={attention} onChange={(event) => setFilter('attention', event.target.checked ? '1' : '')} />
          <span className="text-caption">Needs attention</span>
        </label>
      </div>

      <div className="mb-2">
        <Notice tone={notice.tone}>{notice.text}</Notice>
      </div>

      {error && !works && (
        <p role="alert" className="text-ink/80">
          The works couldn’t load. {error.message} Reload the page to try again.
        </p>
      )}

      {works && works.length === 0 && (
        <div className="flex flex-col items-start gap-1.5 rounded-lg border border-ink/10 bg-surface p-3">
          <p className="font-medium">{filtered ? 'No works match those filters.' : 'No works yet.'}</p>
          {filtered ? (
            <Button variant="outline" onClick={() => { setSearch(''); setParams({}, { replace: true }) }}>
              Clear filters
            </Button>
          ) : (
            <Button href="/admin/works/new?kind=artwork" viewTransition={false}>Add the first artwork</Button>
          )}
        </div>
      )}

      {works && works.length > 0 && (
        <ul className="divide-y divide-ink/10 rounded-lg border border-ink/10 bg-surface">
          {works.map((work) => (
            <li key={work.id} className="flex flex-col gap-1 p-1.5 md:flex-row md:items-center md:gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <MediaThumb media={work.cover} className="size-6" />
                <div className="flex min-w-0 flex-col">
                  <Link to={`/admin/works/${work.id}`} className="truncate font-medium text-ink no-underline hover:text-primary hover:underline">
                    {work.title}
                  </Link>
                  <span className="text-caption text-ink/65">
                    {KIND_LABELS[work.kind]}
                    {work.category && ` · ${work.category.name}`}
                    {work.year && ` · ${work.year}`}
                  </span>
                  {work.problems.length > 0 && (
                    <span className="text-small text-ink/80">
                      <span aria-hidden="true">⚠ </span>
                      {work.problems.map((problem) => problem.message).join(' · ')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 md:justify-end">
                <StatusBadge status={work.status} />
                <Link to={`/admin/works/${work.id}`} className="text-caption text-primary underline-offset-2 hover:underline">
                  Edit
                </Link>
                {work.status === 'archived' ? (
                  <LinkButton disabled={busy} onClick={() => run(() => setWorkStatus(work.id, 'draft'), `Restored “${work.title}” as a draft.`)}>
                    Restore
                  </LinkButton>
                ) : (
                  <LinkButton disabled={busy} onClick={() => setToArchive(work)}>
                    Archive
                  </LinkButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(toArchive)}
        title={`Archive “${toArchive?.title}”?`}
        confirmLabel={`Archive “${toArchive?.title}”`}
        busy={busy}
        onCancel={() => setToArchive(null)}
        onConfirm={() => run(() => archiveWork(toArchive.id), `Archived “${toArchive.title}”. Filter by Archived to restore it.`)}
      >
        <p>
          It comes off the public site. Nothing is deleted, and you can restore it from the Archived filter.
        </p>
      </ConfirmDialog>
    </>
  )
}
