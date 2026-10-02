import Button from '../Button.jsx'
import Chip from '../Chip.jsx'
import Placeholder from '../Placeholder.jsx'

const SOFTWARE = ['Blender', 'Photoshop', 'After Effects', 'Krita', 'Audition']

export default function AboutSummary() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5 px-2 py-6 md:flex-row md:items-center md:px-3 lg:px-5 lg:py-8">
      <Placeholder label="Portrait photo" className="aspect-[3/4] w-full max-w-[300px] shrink-0 rounded-lg" />

      <div className="flex flex-col items-start gap-2">
        <h2 className="font-display text-heading text-primary">About Lui</h2>

        <p>
          I'm a multimedia artist specializing in 3D modeling, illustration and visual storytelling —
          happiest when a prop, a background and a character all have to agree on the same world.
        </p>

        <ul className="flex flex-wrap gap-1" aria-label="Software">
          {SOFTWARE.map((name) => (
            <li key={name}>
              <Chip>{name}</Chip>
            </li>
          ))}
        </ul>

        <Button variant="outline" href="/about">Read the full story →</Button>
      </div>
    </section>
  )
}
