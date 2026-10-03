import PeekButton from '../PeekButton.jsx'
import { BUNNIES } from '../../data/stickers.js'
import Chip from '../Chip.jsx'
import DisplayTitle from '../DisplayTitle.jsx'
import Placeholder from '../Placeholder.jsx'
import { useSite } from '../SiteContent.jsx'

const SOFTWARE = ['Blender', 'Photoshop', 'After Effects', 'Krita', 'Audition']

// A grid so the portrait can change places. On phones it is a thumbnail beside
// the heading, so the text starts on the same screen (as on the About page).
// From md up it is full size, spanning both rows to the left of the text.
export default function AboutSummary() {
  const { portrait } = useSite()

  return (
    <section className="mx-auto grid max-w-6xl grid-cols-[120px_1fr] items-center gap-x-2.5 gap-y-3 px-2 py-6 md:grid-cols-[300px_1fr] md:gap-x-5 md:gap-y-2 md:px-3 lg:px-5 lg:py-8">
      {portrait ? (
        <img src={portrait.url} alt={portrait.altText || 'Portrait of Lui'} className="aspect-[3/4] w-full rounded-lg object-cover md:row-span-2" />
      ) : (
        <Placeholder label="Portrait photo" className="aspect-[3/4] w-full rounded-lg md:row-span-2" />
      )}

      <DisplayTitle as="h2" text="About Lui" className="font-display text-heading text-primary md:self-end" />

      <div className="col-span-2 flex flex-col items-start gap-2 md:col-span-1 md:col-start-2 md:self-start">
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

        {/* A startled bunny peeks over the top edge, somewhere new each time. */}
        <PeekButton sticker={BUNNIES.surprised} align="random" show={0.95} size="5rem" variant="outline" href="/about" className="w-full md:w-auto">
          Read the full story →
        </PeekButton>
      </div>
    </section>
  )
}
