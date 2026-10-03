// The admin dashboard and the activity log. Future endpoints:
//   GET /api/admin/dashboard     getDashboard()
//   GET /api/admin/activity      listActivity(filters)

import { query } from './db.js'
import { STORAGE_LIMIT_BYTES, KINDS, STATUSES } from './shared.js'
import { workProblems } from './works.js'

// Newest first, each with `actorName`. Filters, all optional:
//   limit      default 20
//   entity     'work', 'media', 'category'…
//   entityId   one record's history
export function listActivity({ limit = 20, entity, entityId } = {}) {
  return query((db) => recentActivity(db, { limit, entity, entityId }))
}

function recentActivity(db, { limit, entity, entityId }) {
  return db.activityLog
    .filter((entry) => (!entity || entry.entity === entity) && (!entityId || entry.entityId === entityId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map((entry) => ({ ...entry, actorName: db.admins.find((admin) => admin.userId === entry.actorId)?.displayName ?? 'Someone' }))
}

// {
//   total, byStatus: { draft, ready, … }, byKind: { artwork, model, video },
//   needsAttention: [{ id, title, kind, status, problems }], blockers first,
//   storage: { usedBytes, limitBytes, files },
//   activity: the 8 latest log entries
// }
// Archived works only count towards byStatus.archived.
export function getDashboard() {
  return query((db) => {
    const byStatus = Object.fromEntries(STATUSES.map((status) => [status, 0]))
    const byKind = Object.fromEntries(KINDS.map((kind) => [kind, 0]))
    for (const work of db.works) {
      byStatus[work.status] += 1
      if (work.status !== 'archived') byKind[work.kind] += 1
    }

    const blockers = (work) => work.problems.filter((problem) => problem.level === 'blocker').length
    const needsAttention = db.works
      .map((work) => ({ id: work.id, title: work.title, kind: work.kind, status: work.status, problems: workProblems(db, work) }))
      .filter((work) => work.problems.length)
      .sort((a, b) => blockers(b) - blockers(a) || b.problems.length - a.problems.length)

    // Only uploads count; linked files live on Drive or YouTube.
    const uploads = db.media.filter((media) => media.source === 'supabase')

    return {
      total: db.works.length - byStatus.archived,
      byStatus,
      byKind,
      needsAttention,
      storage: { usedBytes: uploads.reduce((sum, media) => sum + (media.bytes ?? 0), 0), limitBytes: STORAGE_LIMIT_BYTES, files: uploads.length },
      activity: recentActivity(db, { limit: 8 }),
    }
  })
}
