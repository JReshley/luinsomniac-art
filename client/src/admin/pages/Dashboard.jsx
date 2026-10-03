import { Link } from 'react-router-dom'
import AdminPageHeader from '../AdminPageHeader.jsx'
import { useSession } from '../auth.js'
import { Button, LoadError, RefreshStatus, Skeleton } from '../ui.jsx'
import { formatBytes, getDashboard, getSettings, useApi } from '../../api/index.js'

// The first page after signing in. The to-do list comes first, since that's
// what an admin opens it for; the counts, storage and recent edits sit beside
// it for a glance.

const KIND_LABELS = { artwork: 'artwork', model: '3D model', video: 'video' }
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

// Places on the public site that show a placeholder until a file is chosen in
// Site settings: [setting, what it is, where it shows, settings section].
const SITE_SLOTS = [
  ['home_reel', 'Prop samples video', 'home page', 'home-page'],
  ['portrait', 'Portrait', 'About page and home page', 'about-page'],
]

// How many flagged works to list before linking to the rest.
const ATTENTION_LIMIT = 6

export default function Dashboard() {
  const session = useSession()
  const api = useApi(getDashboard, [])
  const settingsApi = useApi(getSettings, [])
  const { data, error } = api
  const emptySlots = settingsApi.data ? SITE_SLOTS.filter(([key]) => !settingsApi.data[key]?.mediaId) : []

  const actions = <Button href="/admin/works/new">Add work</Button>

  if (!data) {
    return (
      <>
        <AdminPageHeader title={`Hi, ${session.name}`} actions={actions} />
        {error ? <LoadError what="dashboard" error={error} /> : <Skeleton rows={5} className="lg:max-w-[66%]" />}
      </>
    )
  }

  const { total, byStatus, byKind, needsAttention, storage, activity } = data
  // 'ready' is private like a draft, and the admin shows it as one.
  const counts = [
    ['draft', 'Drafts', byStatus.draft + byStatus.ready],
    ['published', 'Published', byStatus.published],
    ['archived', 'Archived', byStatus.archived],
  ]

  return (
    <>
      <AdminPageHeader title={`Hi, ${session.name}`} actions={actions} status={<RefreshStatus sources={[api, settingsApi]} />}>
        {plural(total, 'work')} on file: {Object.entries(byKind).map(([kind, count]) => plural(count, KIND_LABELS[kind])).join(', ')}.
      </AdminPageHeader>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          title="To do"
          count={needsAttention.length}
          footer={
            needsAttention.length > ATTENTION_LIMIT && (
              <Link to="/admin/works?attention=1" className="inline-flex min-h-[2.75rem] items-center self-start text-caption text-primary underline-offset-2 hover:underline">
                See all {needsAttention.length} →
              </Link>
            )
          }
        >
          {needsAttention.length === 0 ? (
            <p className="text-ink/65">All done. Every work has its files and can be published.</p>
          ) : (
            <>
              <p className="text-caption text-ink/65">Works missing a file or something they need before they can be published.</p>
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
            </>
          )}
        </Panel>

        <div className="flex flex-col gap-3">
          {emptySlots.length > 0 && (
            <Panel title="Placeholders on the site" count={emptySlots.length}>
              <ul className="flex flex-col">
                {emptySlots.map(([key, label, where, section]) => (
                  <li key={key}>
                    <Link
                      to={`/admin/settings#${section}`}
                      className="-mx-1 flex min-h-[2.75rem] flex-col justify-center rounded-sm px-1 no-underline hover:bg-ink/5"
                    >
                      <span className="font-medium text-primary">Add the {label.toLowerCase()} →</span>
                      <span className="text-caption text-ink/65">Shows a placeholder on the {where}.</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="Works">
            <ul className="grid grid-cols-3 gap-1">
              {counts.map(([status, label, count]) => (
                <li key={status}>
                  <Link
                    to={`/admin/works?status=${status}`}
                    className="flex flex-col rounded-sm border border-ink/10 px-1.5 py-1 no-underline hover:border-primary/50 hover:bg-primary/5"
                  >
                    <span className="text-lead font-bold tabular-nums">{count}</span>
                    <span className="text-caption text-ink/65">{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
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

          <Panel title="Upload storage">
            <StorageMeter {...storage} />
            <p className="text-caption text-ink/65">Drive and YouTube files don’t count.</p>
          </Panel>
        </div>
      </div>
    </>
  )
}

function Panel({ title, count, footer, children }) {
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-ink/10 bg-surface p-2">
      <h2 className="flex items-center gap-1 leading-[1.25] font-bold">
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
