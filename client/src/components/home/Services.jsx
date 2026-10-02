import SectionHeader from '../SectionHeader.jsx'
import SlapSticker from '../SlapSticker.jsx'
import { BUNNIES } from '../../data/stickers.js'

const SERVICES = [
  { title: '3D modeling', body: 'Hard-surface and stylized props, game-ready or render-ready.' },
  { title: 'Background design', body: 'Layout, colour keys and paintings for animation.' },
  { title: 'Character creation', body: 'Turnarounds, expression sheets, model-ready designs.' },
  { title: 'Animation & FX', body: 'Lighting, effects and edit — reels delivered on YouTube.' },
]

export default function Services() {
  return (
    <section className="relative bg-primary px-2 py-6 md:px-3 lg:px-5 lg:py-8">
      {/* The crying bunny has flopped over the band's top edge: it will
          handle the job, it just needs a minute first. */}
      <SlapSticker
        sticker={BUNNIES.cryFirst}
        tilt="-4deg"
        className="absolute top-0 right-2 w-[8rem] -translate-y-2/5 md:right-6 md:w-[12rem] md:-translate-y-3/5 lg:right-[max(3rem,calc(50%-34rem))] lg:w-[14rem]"
      />
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
