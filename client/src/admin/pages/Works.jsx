import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { archiveWork, listCategories, listWorks, setWorkStatus, useApi } from '../../api/index.js'
import AdminPageHeader from '../AdminPageHeader.jsx'
import { MediaThumb } from '../MediaPicker.jsx'
import {
  Button,
  ConfirmDialog,
  EmptyState,
  KIND_LABELS,
  LinkButton,
  ListToolbar,
  LoadError,
  Notice,
  PAGE_SIZE,
  Pager,
  SelectField,
  shownStatus,
  Skeleton,
  StatusBadge,
} from '../ui.jsx'

// All works in one list (page pattern: List). Search, one Filters panel and
// a sort sit above it; filters and sort live in the address
// (?kind=model&status=draft), so a dashboard link, a bookmark and the back
// button all land on the same view.

const SORTS = [
  ['edited', 'Last edited', (a, b) => b.updatedAt.localeCompare(a.updatedAt)],
  ['title', 'Title, A to Z', (a, b) => a.title.localeCompare(b.title)],
  ['year', 'Year, newest first', (a, b) => (b.year ?? 0) - (a.year ?? 0)],
]

export default function Works() {
  const [params, setParams] = useSearchParams()
  const kind = params.get('kind') || undefined
  const status = params.get('status') || undefined
  const categoryId = params.get('category') || undefined
  const attention = params.get('attention') === '1'
  const sort = params.get('sort') || 'edited'
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [toArchive, setToArchive] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState({ tone: 'info', text: '' })

  // Drafts include the old 'ready' status, so they're picked out here rather
  // than by the API's exact match.
  const { data: found, error } = useApi(
    () => listWorks({ kind, status: status === 'draft' ? undefined : status, categoryId, attention, search }),
    [kind, status, categoryId, attention, search]
  )
  const { data: categories } = useApi(listCategories, [])

  const compare = (SORTS.find(([value]) => value === sort) ?? SORTS[0])[2]
  const works = found && (status === 'draft' ? found.filter((work) => shownStatus(work.status) === 'draft') : found).slice().sort(compare)
  const shown = works?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function setParam(name, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value)
    else next.delete(name)
    setParams(next, { replace: true })
    setPage(1)
  }

  function clearFilters() {
    setSearch('')
    setParams(sort === 'edited' ? {} : { sort }, { replace: true })
    setPage(1)
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

  const filters = [
    { name: 'kind', label: 'Type', options: Object.entries(KIND_LABELS) },
    { name: 'status', label: 'Status', options: [['draft', 'Draft'], ['published', 'Published'], ['archived', 'Archived']] },
    { name: 'category', label: 'Category', options: (categories ?? []).map((category) => [category.id, category.name]) },
    { name: 'attention', label: 'Only to-dos', checkbox: true },
  ]
  const filtered = Boolean(kind || status || categoryId || attention || search.trim())

  return (
    <>
      <AdminPageHeader title="Works" actions={<Button href={`/admin/works/new${kind ? `?kind=${kind}` : ''}`}>Add work</Button>}>
        Every artwork, 3D model and video. Open one to edit it.
      </AdminPageHeader>

      <ListToolbar
        search={search}
        onSearch={(value) => { setSearch(value); setPage(1) }}
        searchHint="Searches titles and tags."
        filters={filters}
        values={{ kind, status, category: categoryId, attention: attention ? '1' : '' }}
        onFilter={setParam}
        onClearAll={clearFilters}
      >
        <SelectField label="Sort" className="min-w-[12rem]" value={sort} onChange={(event) => setParam('sort', event.target.value === 'edited' ? '' : event.target.value)}>
          {SORTS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </SelectField>
      </ListToolbar>

      <div className="mb-2">
        <Notice tone={notice.tone}>{notice.text}</Notice>
      </div>

      {!works && (error ? <LoadError what="works" error={error} /> : <Skeleton rows={6} />)}

      {works && (
        <div className="rounded-lg border border-ink/10 bg-surface">
          {works.length === 0 ? (
            filtered ? (
              <EmptyState title="No works match these filters." action={<Button variant="outline" onClick={clearFilters}>Clear all filters</Button>}>
                Try fewer filters or a shorter search.
              </EmptyState>
            ) : (
              <EmptyState title="No works yet." action={<Button href="/admin/works/new">Add the first work</Button>}>
                Works you add here appear in the Museum and on the home page once they’re published.
              </EmptyState>
            )
          ) : (
            <ul className="divide-y divide-ink/10">
              {shown.map((work) => (
                <li key={work.id} className="flex flex-col gap-1 p-2 md:flex-row md:items-center md:gap-2">
                  <Link to={`/admin/works/${work.id}`} className="group flex min-w-0 flex-1 items-center gap-2 rounded-sm no-underline">
                    <MediaThumb media={work.cover} className="size-6" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium text-primary underline-offset-2 group-hover:underline">{work.title}</span>
                      <span className="text-caption text-ink/65">
                        {KIND_LABELS[work.kind]}
                        {work.category && ` · ${work.category.name}`}
                        {work.year && ` · ${work.year}`}
                      </span>
                      {work.problems.length > 0 && (
                        <span className="text-caption text-ink/80">
                          <span aria-hidden="true">⚠ </span>
                          {work.problems.map((problem) => problem.message).join(' · ')}
                        </span>
                      )}
                    </span>
                    <span aria-hidden="true" className="text-lead text-ink/45 md:hidden">›</span>
                  </Link>

                  <div className="flex items-center gap-1 md:justify-end">
                    <StatusBadge status={work.status} />
                    {work.status === 'archived' ? (
                      <LinkButton disabled={busy} onClick={() => run(() => setWorkStatus(work.id, 'draft'), `Restored “${work.title}” as a draft.`)} aria-label={`Restore ${work.title} as a draft`}>
                        Restore
                      </LinkButton>
                    ) : (
                      <LinkButton disabled={busy} onClick={() => setToArchive(work)} aria-label={`Archive ${work.title}`}>
                        Archive
                      </LinkButton>
                    )}
                    <span aria-hidden="true" className="hidden text-lead text-ink/45 md:inline">›</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Pager page={page} total={works.length} onPage={setPage} noun="work" />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toArchive)}
        title={`Archive “${toArchive?.title}”?`}
        confirmLabel={`Archive “${toArchive?.title}”`}
        busy={busy}
        onCancel={() => setToArchive(null)}
        onConfirm={() => run(() => archiveWork(toArchive.id), `Archived “${toArchive.title}”. Filter by Archived to restore it.`)}
      >
        <p>It comes off the public site. Nothing is deleted, and you can restore it from the Archived filter.</p>
      </ConfirmDialog>
    </>
  )
}
