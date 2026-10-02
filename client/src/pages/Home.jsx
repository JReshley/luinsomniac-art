
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
    <main id="main" className="bg-surface">
      {SECTIONS.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className="flex items-center justify-center border-b border-dashed border-ink/10"
          style={{ minHeight: section.height }}
        >
          <span className="font-mono text-small text-ink/65 uppercase">{section.label}</span>
        </section>
      ))}
    </main>
  )
}
