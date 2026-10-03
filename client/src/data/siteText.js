// The site's own words: shown until the admin saves their own in Site settings,
// and when a field there is cleared. The admin starts its fields from these
// too, so what you edit is what the site shows.
//
// Keys name where the text appears, page first.

export const DEFAULT_TEXT = {
  'home.hero.status': 'Open for commissions',
  'home.hero.intro':
    'Multimedia artist working across prop modeling, background design, character creation and story-driven animation — from first thumbnail to final render.',
  'home.about':
    'I’m a multimedia artist specializing in 3D modeling, illustration and visual storytelling — happiest when a prop, a background and a character all have to agree on the same world.',
  'about.intro':
    'Multimedia artist specializing in 3D modeling, illustration and visual storytelling. I like the unglamorous middle of production — the pass where a prop stops looking like geometry and starts looking like something someone owns.',
  'about.body':
    'Most of my work sits between departments: modeling props that have to match a painted background, designing characters that have to survive being rigged, lighting shots that have to cut together. That range is deliberate — it means fewer handoffs and fewer surprises.',
  // Comma-separated, in the order shown.
  'about.software': 'Blender, Photoshop, After Effects, Krita, Audition',
}

// The About page's "Selected experience", newest first. The database starts
// with these rows (server/db/schema.sql), and the site shows them until the
// API answers.
export const DEFAULT_EXPERIENCE = [
  { id: 'freelance', years: '2025—now', role: 'Freelance 3D & 2D artist', detail: 'Props, backgrounds, commissioned animation' },
  { id: 'org', years: '2024—2025', role: 'President, multimedia arts org', detail: 'Ran events, branding and student productions' },
  { id: 'degree', years: '2022—2026', role: 'BS Entertainment & Multimedia Computing', detail: 'Specialization in animation' },
]

// "Blender, Photoshop" -> ['Blender', 'Photoshop']
export const softwareList = (text) => String(text ?? '').split(',').map((name) => name.trim()).filter(Boolean)
