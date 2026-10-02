// Sample 3D models for the 3D Showcase until the backend serves them. The
// fields follow the showcase spreadsheet's columns, so the API response can
// keep the same names.
//
//   type          what kind of piece it is ("Prop modeling", "Environment"…)
//   software      the tools used, in the order they were used
//   description   one or two sentences for the details panel
//   processNotes  optional longer notes, shown under "Process notes"
//   modelUrl      the .glb file. null until it exists, which shows a placeholder
//   posterUrl     optional still image, also used as the card thumbnail
//   turntableUrl  optional turntable video file
//   externalUrl   optional Sketchfab or YouTube link
//   polyCount     triangle count
//   textured      whether the model ships with textures
//   alt           describes the model for screen readers
//   order         lower numbers show first
//   status        only "published" models are listed

export const MODELS = [
  {
    id: 'diner-prop-set',
    title: 'Diner prop set',
    year: 2026,
    type: 'Prop modeling',
    software: ['Blender', 'Photoshop'],
    description:
      'Twelve hero props built for a 1960s diner set, modular so the layout team could redress the room in an afternoon.',
    processNotes:
      'Blocked out against the background painting first so the silhouettes matched. Shared one texture atlas across every prop to keep draw calls low.',
    modelUrl: null,
    posterUrl: null,
    turntableUrl: null,
    externalUrl: 'https://www.youtube.com/',
    polyCount: 184000,
    textured: true,
    tags: ['props', 'stylized', 'interior'],
    alt: 'A set of stylized 1960s diner props: stools, a counter, a jukebox and table settings.',
    order: 1,
    status: 'published',
  },
  {
    id: 'vending-machine',
    title: 'Vending machine',
    year: 2024,
    type: 'Prop modeling',
    software: ['Blender'],
    description: 'A clay-style vending machine with swappable product shelves.',
    processNotes: null,
    modelUrl: null,
    posterUrl: null,
    turntableUrl: null,
    externalUrl: 'https://sketchfab.com/',
    polyCount: 72000,
    textured: false,
    tags: ['props', 'clay'],
    alt: 'A rounded, clay-style vending machine with rows of drinks behind glass.',
    order: 2,
    status: 'published',
  },
  {
    id: 'market-stall',
    title: 'Market stall',
    year: 2025,
    type: 'Environment',
    software: ['Blender', 'Substance Painter'],
    description: 'A night-market food stall with a canvas awning, crates and hanging lights.',
    processNotes: 'Lit with emissive bulbs only, to check the textures held up without fill light.',
    modelUrl: null,
    posterUrl: null,
    turntableUrl: null,
    externalUrl: null,
    polyCount: 118000,
    textured: true,
    tags: ['environment', 'night'],
    alt: 'A wooden market stall with a striped awning, stacked crates and string lights.',
    order: 3,
    status: 'published',
  },
  {
    id: 'desk-lamp-trio',
    title: 'Desk lamp trio',
    year: 2024,
    type: 'Prop modeling',
    software: ['Blender'],
    description: 'Three stylized desk lamps sharing one hinge rig, posed for a prop sheet.',
    processNotes: null,
    modelUrl: null,
    posterUrl: null,
    turntableUrl: null,
    externalUrl: null,
    polyCount: 24000,
    textured: true,
    tags: ['props', 'stylized'],
    alt: 'Three desk lamps in different shapes, each bent at the same hinge.',
    order: 4,
    status: 'published',
  },
]

// What the showcase lists: published models only, in display order.
export const PUBLISHED_MODELS = MODELS.filter((model) => model.status === 'published').sort((a, b) => a.order - b.order)

// 184000 -> "184k", 1250000 -> "1.3M". Small counts stay as they are.
export function formatTris(count) {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (count >= 1000) return `${Math.round(count / 1000)}k`
  return String(count)
}
