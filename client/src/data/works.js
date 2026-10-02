// Sample works until the backend serves them. Keep the same field names in the
// API response so components don't need to change when it switches over.
//
//   type      "image" or "video"
//   width,    the asset's pixel size; cards use it for their shape
//   height
//   imageUrl  null until real assets exist, which shows a placeholder
//   featured  true to show it on the Home page

export const WORKS = [
  {
    id: 'diner-prop-set',
    title: 'Diner prop set',
    category: '3D',
    type: 'image',
    width: 1460,
    height: 1000,
    imageUrl: null,
    description: 'A set of stylized diner props, modeled and textured in Blender.',
    year: 2026,
    featured: true,
  },
  {
    id: 'ani-turnaround',
    title: 'Ani — turnaround',
    category: 'Character',
    type: 'image',
    width: 1460,
    height: 600,
    imageUrl: null,
    description: 'Front, side and back views of Ani, ready for modeling.',
    year: 2026,
    featured: true,
  },
  {
    id: 'luinsomniac-short',
    title: 'Luinsomniac short',
    category: 'Animation',
    type: 'video',
    width: 1460,
    height: 767,
    imageUrl: null,
    description: 'A short animated piece, from storyboard to final render.',
    year: 2025,
    featured: true,
  },
  {
    id: 'night-street',
    title: 'Night street',
    category: 'Background',
    type: 'image',
    width: 1460,
    height: 700,
    imageUrl: null,
    description: 'A painted night-time street background for animation.',
    year: 2025,
    featured: true,
  },
  {
    id: 'encore',
    title: 'Encore',
    category: '2D art',
    type: 'image',
    width: 1460,
    height: 900,
    imageUrl: null,
    description: 'A stage illustration with a warm spotlight palette.',
    year: 2025,
    featured: true,
  },
  {
    id: 'vending-props',
    title: 'Vending props',
    category: 'Props',
    type: 'image',
    width: 1460,
    height: 533,
    imageUrl: null,
    description: 'Clay-style vending machine props.',
    year: 2024,
    featured: true,
  },
]
