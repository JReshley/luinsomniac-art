// The mock database's starting data, built from the hard-coded files the public
// site reads today (data/works.js, data/models.js, data/contact.js). Phase 4
// turns the same mapping into server/db/seed.sql.
//
// Notes on the mapping:
// - works.js and models.js both list the diner prop set. It becomes one work
//   of kind "model", which is what the planned single works table is for.
// - Every sample is published, own work, with no real faces, since that's what
//   the live site shows today.
// - A model's "type" ("Prop modeling", "Environment") has no column in the
//   schema, so it becomes a tag.
// - No sample has image, .glb or video files yet, so the media table starts
//   empty and the dashboard flags each work for it.

import { WORKS } from '../data/works.js'
import { MODELS } from '../data/models.js'
import { EMAIL, SOCIALS } from '../data/contact.js'

// The Museum's filter order (pages/Museum.jsx).
const CATEGORIES = ['3D', 'Props', 'Background', 'Character', '2D art', 'Animation']

export const slugify = (text) =>
  text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export function buildSeed(version) {
  const now = new Date().toISOString()
  const id = () => crypto.randomUUID()

  const categories = CATEGORIES.map((name, i) => ({ id: id(), name, slug: slugify(name), sortOrder: i }))
  const categoryId = (name) => categories.find((category) => category.name === name)?.id ?? null

  const work = (fields) => ({
    id: id(),
    year: null,
    categoryId: null,
    description: '',
    tags: [],
    coverMediaId: null,
    featured: false,
    status: 'published',
    isOwnWork: true,
    showsRealFace: false,
    faceConsent: false,
    notesArtist: '',
    notesAdmin: '',
    createdAt: now,
    updatedAt: now,
    updatedBy: null,
    ...fields,
  })

  const works = []
  const modelDetails = []
  const videoDetails = []

  // Models first, so works.js entries that repeat one can be skipped.
  for (const model of [...MODELS].sort((a, b) => a.order - b.order)) {
    const row = work({
      slug: model.id,
      kind: 'model',
      title: model.title,
      year: model.year,
      categoryId: categoryId('3D'),
      description: model.description,
      tags: [...new Set([...model.tags, model.type.toLowerCase()])],
      featured: WORKS.some((item) => item.id === model.id && item.featured),
      sortOrder: works.length,
      status: model.status,
    })
    works.push(row)
    modelDetails.push({
      workId: row.id,
      software: model.software,
      processNotes: model.processNotes ?? '',
      modelMediaId: null,
      turntableMediaId: null,
      polyCount: model.polyCount,
      textured: model.textured,
      externalUrl: model.externalUrl,
    })
  }

  for (const item of WORKS) {
    if (works.some((row) => row.slug === item.id)) continue
    const row = work({
      slug: item.id,
      kind: item.type === 'video' ? 'video' : 'artwork',
      title: item.title,
      year: item.year,
      categoryId: categoryId(item.category),
      description: item.description,
      featured: item.featured,
      sortOrder: works.length,
    })
    works.push(row)
    if (row.kind === 'video') {
      videoDetails.push({ workId: row.id, mediaId: null, duration: null, audioCleared: false, relatedWorkId: null })
    }
  }

  return {
    version,
    admins: [
      { userId: 'admin-john', displayName: 'John', role: 'admin' },
      { userId: 'admin-lui', displayName: 'Lui', role: 'admin' },
    ],
    media: [],
    categories,
    works,
    modelDetails,
    videoDetails,
    workMedia: [],
    // Two keys to start with. Phase 5 moves the rest of the public pages'
    // copy in here as each page switches to the data layer.
    siteText: [
      { key: 'home.hero.status', value: 'Open for commissions', updatedAt: now, updatedBy: null },
      {
        key: 'home.hero.intro',
        value:
          'Multimedia artist working across prop modeling, background design, character creation and story-driven animation — from first thumbnail to final render.',
        updatedAt: now,
        updatedBy: null,
      },
    ],
    socialLinks: SOCIALS.map((social, i) => ({
      id: id(),
      platform: social.id,
      handle: social.href.split('/').pop(),
      url: social.href,
      visible: true,
      sortOrder: i,
    })),
    settings: [
      { key: 'contact_email', value: EMAIL, mediaId: null },
      { key: 'display_name', value: 'Luinsomniac Art', mediaId: null },
      { key: 'logo', value: null, mediaId: null },
      { key: 'icon', value: null, mediaId: null },
      { key: 'portrait', value: null, mediaId: null },
      { key: 'home_reel', value: null, mediaId: null },
    ],
    activityLog: [],
  }
}
