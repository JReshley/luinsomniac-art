import { Router } from 'express'
import { pool } from '../db/pool.js'
import { route } from '../errors.js'
import { loadDb } from '../rows.js'
import { KINDS, STATUSES, workProblems } from '../workRules.js'

// The dashboard and the activity log.

// Supabase's free plan includes 1 GB of file storage.
const STORAGE_LIMIT_BYTES = 1024 ** 3

async function recentActivity(db, { limit, entity, entityId }) {
  const { rows } = await db.query(
    `SELECT a.id, a.actor_id, a.action, a.entity, a.entity_id, a.summary, a.created_at, admins.display_name
       FROM activity_log a LEFT JOIN admins ON admins.user_id = a.actor_id
      WHERE ($1::text IS NULL OR a.entity = $1) AND ($2::text IS NULL OR a.entity_id = $2)
      ORDER BY a.created_at DESC LIMIT $3`,
    [entity ?? null, entityId ?? null, limit]
  )
  return rows.map((row) => ({
    id: row.id,
    actorId: row.actor_id,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    summary: row.summary,
    createdAt: row.created_at,
    actorName: row.display_name ?? 'Someone',
  }))
}

export function dashboardRoutes() {
  const router = Router()

  // Newest first, each with `actorName`. Filters, all optional: limit (default
  // 20), entity, entityId.
  router.get('/activity', route(async (request, response) => {
    const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 20))
    response.json(await recentActivity(pool, { limit, entity: request.query.entity, entityId: request.query.entityId }))
  }))

  // {
  //   total, byStatus, byKind, needsAttention: [{ id, title, kind, status, problems }]
  //   (blockers first), storage: { usedBytes, limitBytes, files }, activity: the 8 latest
  // }
  // Archived works only count towards byStatus.archived.
  router.get('/dashboard', route(async (request, response) => {
    const db = await loadDb(pool, ['works', 'media', 'modelDetails', 'videoDetails'])
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

    response.json({
      total: db.works.length - byStatus.archived,
      byStatus,
      byKind,
      needsAttention,
      storage: { usedBytes: uploads.reduce((sum, media) => sum + (media.bytes ?? 0), 0), limitBytes: STORAGE_LIMIT_BYTES, files: uploads.length },
      activity: await recentActivity(pool, { limit: 8 }),
    })
  }))

  return router
}
