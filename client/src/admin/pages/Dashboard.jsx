import { Link } from 'react-router-dom'
import Button from '../../components/Button.jsx'
import AdminPageHeader from '../AdminPageHeader.jsx'
import { useSession } from '../auth.js'
import { formatBytes, getDashboard, STATUSES, useApi } from '../../api/index.js'

// The first page after signing in: what needs fixing, how much there is in
// each state, and shortcuts to the common jobs.

const STATUS_LABELS = { draft: 'Drafts', ready: 'Ready', published: 'Published', archived: 'Archived' }
const KIND_LABELS = { artwork: 'artwork', model: '3D model', video: 'video' }
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

// How many flagged works to list before linking to the rest.
const ATTENTION_LIMIT = 6

export default function Dashboard() {
  const session = useSession()
  const { data, error } = useApi(getDashboard, [])

  const actions = (
    <>
      <Button href="/admin/works/new?kind=artwork" viewTransition={false}>New artwork</Button>
      <Button href="/admin/works/new?kind=model" variant="outline" viewTransition={false}>New 3D model</Button>
      <Button href="/admin/works/new?kind=video" variant="outline" viewTransition={false}>New video</Button>
    </>
  )

  if (!data) {
    return (
      <>
        <AdminPageHeader title={`Hi, ${session.name}`} actions={actions} />
        {error && (
          <p role="alert" className="text-ink/80">
            The dashboard couldn’t load. {error.message} Reload the page to try again.
          </p>
        )}
      </>
    )
  }

  const { total, byStatus, byKind, needsAttention, storage, activity } = data

  return (
    <>
      <AdminPageHeader title={`Hi, ${session.name}`} actions={actions}>
        {plural(total, 'work')}: {Object.entries(byKind).map(([kind, count]) => plural(count, KIND_LABELS[kind])).join(', ')}.
      </AdminPageHeader>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <Panel title="Works by status">
            <ul className="grid grid-cols-2 gap-1 md:grid-cols-4">
              {STATUSES.map((status) => (
                <li key={status}>
                  <Link
                    to={`/admin/works?status=${status}`}
                    className="flex flex-col rounded-sm border border-ink/10 px-1.5 py-1 no-underline hover:border-primary/50 hover:bg-primary/5"
                  >
                    <span className="text-heading font-bold tabular-nums">{byStatus[status]}</span>
                    <span className="text-caption text-ink/65">{STATUS_LABELS[status]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="Needs attention"
            count={needsAttention.length}
            footer={
              needsAttention.length > ATTENTION_LIMIT && (
                <Link to="/admin/works?attention=1" className="text-caption text-primary underline-offset-2 hover:underline">
                  See all {needsAttention.length} →
                </Link>
              )
            }
          >
            {needsAttention.length === 0 ? (
              <p className="text-ink/65">Nothing to fix. Every work has its files and can be published.</p>
            ) : (
              <ul className="divide-y divide-ink/10">
                {needsAttention.slice(0, ATTENTION_LIMIT).map((work) => (
                  <li key={work.id}>
                    <Link
                      to={`/admin/works/${work.id}`}
                      className="-mx-1 flex items-start justify-between gap-2 rounded-sm px-1 py-1 no-underline hover:bg-ink/5"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="font-medium">{work.title}</span>
                        <span className="text-caption text-ink/65">
                          {work.problems.map((problem, i) => (
                            <span key={problem.message}>
                              {i > 0 && ' · '}
                              {/* Things that stop publishing read stronger than missing files. */}
                              <span className={problem.level === 'blocker' ? 'font-medium text-ink' : ''}>{problem.message}</span>
                            </span>
                          ))}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-small text-ink/65 uppercase">{KIND_LABELS[work.kind]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-3">
          <Panel title="Storage">
            <StorageMeter {...storage} />
            <p className="text-caption text-ink/65">
              Uploads only; Drive and YouTube files don’t count. Bandwidth is on the{' '}
              <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">
                Supabase dashboard ↗
              </a>
            </p>
          </Panel>

          <Panel title="Recent activity">
            {activity.length === 0 ? (
              <p className="text-caption text-ink/65">Nothing yet. Edits by either admin are listed here.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {activity.map((entry) => (
                  <li key={entry.id} className="flex flex-col text-caption">
                    <span>
                      <span className="font-medium">{entry.actorName}</span> {lowerFirst(entry.summary)}
                    </span>
                    <time dateTime={entry.createdAt} className="text-small text-ink/65">
                      {timeAgo(entry.createdAt)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  )
}

function Panel({ title, count, footer, children }) {
  return (
    <section className="flex flex-col gap-1.5 rounded-lg border border-ink/10 bg-surface p-2">
      <h2 className="flex items-center gap-1 font-bold">
        {title}
        {count > 0 && <span className="rounded-full bg-accent/20 px-1 font-mono text-small tabular-nums">{count}</span>}
      </h2>
      {children}
      {footer}
    </section>
  )
}

function StorageMeter({ usedBytes, limitBytes, files }) {
  const share = usedBytes / limitBytes
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-caption">
        <span className="font-medium tabular-nums">{usedBytes ? formatBytes(usedBytes) : '0 MB'}</span>
        <span className="text-ink/65"> of {formatBytes(limitBytes)} · {plural(files, 'file')}</span>
      </p>
      <div
        role="meter"
        aria-label="Storage used"
        aria-valuemin={0}
        aria-valuemax={limitBytes}
        aria-valuenow={usedBytes}
        aria-valuetext={`${Math.round(share * 100)}% used`}
        className="h-1 overflow-hidden rounded-full bg-ink/10"
      >
        {/* At least a sliver once anything's stored, so it doesn't read as empty. */}
        <div className={`h-full rounded-full ${share > 0.8 ? 'bg-accent' : 'bg-primary'}`} style={{ width: usedBytes ? `max(4px, ${share * 100}%)` : 0 }} />
      </div>
    </div>
  )
}

// "Published “Encore”" → "published “Encore”", to follow the admin's name.
const lowerFirst = (text) => text.charAt(0).toLowerCase() + text.slice(1)

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

function timeAgo(iso) {
  const seconds = (new Date(iso) - Date.now()) / 1000
  if (seconds > -60) return 'just now'
  for (const [unit, size] of [['day', 86400], ['hour', 3600], ['minute', 60]]) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  }
}
