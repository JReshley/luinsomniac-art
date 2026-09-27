
// Placeholders
const SECTIONS = [
  { id: 'hero', label: 'Hero', height: 520 },
  { id: 'featured-works', label: 'Featured Works', height: 640 },
  { id: 'reel', label: 'Reel Section', height: 480 },
  { id: 'services', label: 'Services', height: 520 },
  { id: 'about-summary', label: 'About Summary', height: 420 },
]

export default function Home() {
  return (
    <main className="home">
        // Placeholders
      {SECTIONS.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className="placeholder"
          style={{ minHeight: section.height }}
        >
          <span className="placeholder__label">{section.label}</span>
        </section>
      ))}
    </main>
  )
}
