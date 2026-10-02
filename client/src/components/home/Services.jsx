import SectionHeader from '../SectionHeader.jsx'

const SERVICES = [
  { title: '3D modeling', body: 'Hard-surface and stylized props, game-ready or render-ready.' },
  { title: 'Background design', body: 'Layout, colour keys and paintings for animation.' },
  { title: 'Character creation', body: 'Turnarounds, expression sheets, model-ready designs.' },
  { title: 'Animation & FX', body: 'Lighting, effects and edit — reels delivered on YouTube.' },
]

export default function Services() {
  return (
    <section className="bg-primary px-2 py-6 md:px-3 lg:px-5 lg:py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <SectionHeader title="What I do" onDark />

        <ul className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((service) => (
            // The cards aren't links, so the hover is only an orange edge, not a
            // full orange fill that would say "click me".
            <li
              key={service.title}
              className="flex flex-col gap-1 rounded-lg border border-surface/20 bg-surface/10 p-2.5 text-bg transition-colors hover:border-accent"
            >
              <h3 className="font-medium">{service.title}</h3>
              {/* Full-strength text: at /80 it was 3.8 : 1 on this tinted card. */}
              <p>{service.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
