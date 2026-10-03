import { Link } from 'react-router-dom'
import Button from '../../components/Button.jsx'
import AdminPageHeader from '../AdminPageHeader.jsx'
import { useSession } from '../auth.js'
import { getDashboard, STATUSES } from '../dashboardData.js'

// The first page after signing in: what needs fixing, how much there is in
// each state, and shortcuts to the common jobs.

const STATUS_LABELS = { draft: 'Drafts', ready: 'Ready', published: 'Published', archived: 'Archived' }
const KIND_LABELS = { artwork: 'artwork', model: '3D model', video: 'video' }
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

// How many flagged works to list before linking to the rest.
const ATTENTION_LIMIT = 6

export default function Dashboard() {
  const session = useSession()
  const { total, byStatus, byKind, needsAttention, storage, activity } = getDashboard()

  return (
    <>
      <AdminPageHeader
        title={`Hi, ${session.name}`}
        actions={
          <>
            <Button href="/admin/works/new?kind=artwork" viewTransition={false}>New artwork</Button>
            <Button href="/admin/works/new?kind=model" variant="outline" viewTransition={false}>New 3D model</Button>
            <Button href="/admin/works/new?kind=video" variant="outline" viewTransition={false}>New video</Button>
          </>
        }
      >
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
              <p className="text-ink/65">Nothing to fix. Every published work has its files.</p>
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
                        <span className="text-caption text-ink/65">{work.problems.join(' · ')}</span>
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
            {storage ? null : (
              <p className="text-caption text-ink/65">
                Shows once uploads go to Supabase. Bandwidth lives on the{' '}
                <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">
                  Supabase dashboard ↗
                </a>
                .
              </p>
            )}
          </Panel>

          <Panel title="Recent activity">
            {activity.length === 0 && (
              <p className="text-caption text-ink/65">Edits by either admin will be listed here once the editor saves.</p>
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
