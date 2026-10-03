// What the dashboard shows, worked out from the hard-coded sample files the
// public site still reads (data/works.js and data/models.js).
//
// Stand-in until the mock data layer (admin plan, phase 2) gives the admin its
// own works with real statuses. Then this file goes, and the dashboard asks the
// data layer for the same shape.

import { WORKS } from '../data/works.js'
import { MODELS } from '../data/models.js'

export const STATUSES = ['draft', 'ready', 'published', 'archived']

// One list in the shape of the planned `works` table: kind is artwork, model
// or video. The sample files have no drafts; works.js has no status at all, and
// everything in it is on the site.
const ALL_WORKS = [
  ...WORKS.map((work) => ({
    id: work.id,
    title: work.title,
    kind: work.type === 'video' ? 'video' : 'artwork',
    status: 'published',
    hasCover: Boolean(work.imageUrl),
  })),
  ...MODELS.map((model) => ({
    id: `model-${model.id}`,
    title: model.title,
    kind: 'model',
    status: model.status,
    hasCover: Boolean(model.posterUrl),
    hasModelFile: Boolean(model.modelUrl),
  })),
]

export function getDashboard() {
  const byStatus = Object.fromEntries(STATUSES.map((status) => [status, 0]))
  const byKind = { artwork: 0, model: 0, video: 0 }
  for (const work of ALL_WORKS) {
    byStatus[work.status] += 1
    byKind[work.kind] += 1
  }

  // The works with the most wrong come first.
  const needsAttention = ALL_WORKS.flatMap((work) => {
    const problems = []
    if (work.kind === 'model' && !work.hasModelFile) problems.push('No .glb file, so the 3D viewer shows a placeholder')
    if (!work.hasCover) problems.push('No cover image')
    return problems.length ? [{ ...work, problems }] : []
  }).sort((a, b) => b.problems.length - a.problems.length)

  return {
    total: ALL_WORKS.length,
    byStatus,
    byKind,
    needsAttention,
    // From summing media.bytes once the media table exists.
    storage: null,
    // From activity_log once saving works.
    activity: [],
  }
}
