// Adds a row to activity_log. Called inside the same transaction as the change
// it describes, so the two are saved together or not at all.
export async function logActivity(db, actorId, action, entity, entityId, summary) {
  await db.query(
    'INSERT INTO activity_log (actor_id, action, entity, entity_id, summary) VALUES ($1, $2, $3, $4, $5)',
    [actorId, action, entity, entityId === null || entityId === undefined ? null : String(entityId), summary]
  )
}
