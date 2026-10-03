import { useMemo, useState } from 'react'
import { listPublishedWorks, useApi } from '../../api/index.js'
import { toCard } from '../../lib/publicWork.js'
import { BUNNIES } from '../../data/stickers.js'
import PeekButton from '../PeekButton.jsx'
import Lightbox from '../Lightbox.jsx'
import SectionHeader from '../SectionHeader.jsx'
import WorkCard from '../WorkCard.jsx'

export default function FeaturedWorks() {
  const { data, error } = useApi(() => listPublishedWorks({ featured: true }), [])
  const featured = useMemo(() => (data ?? []).map(toCard), [data])

  // Index of the work shown in the Lightbox, or null when it is closed.
  const [openIndex, setOpenIndex] = useState(null)

  // Wraps around, so "next" on the last work goes back to the first.
  function step(direction) {
    setOpenIndex((index) => (index + direction + featured.length) % featured.length)
  }

  return (
    // The blue focus ring fails contrast on navy, so it turns orange inside this band.
    <section className="bg-ink px-2 py-6 md:px-3 lg:px-5 lg:py-8 **:focus-visible:outline-accent">
      <div className="mx-auto flex max-w-page flex-col gap-4">
        <SectionHeader
          title="Featured in the Museum"
          description="A mix of modeling, backgrounds and finished frames."
          onDark
          action={
            // The museum is on fire: the flaming bunny rises from behind the button.
            <PeekButton sticker={BUNNIES.fire} variant="outline" onDark href="/museum" className="w-full md:w-auto">
              Enter the Museum →
            </PeekButton>
          }
        />

        {/* CSS columns give the masonry layout: cards fill each column top to bottom. */}
        {error && !data && <p role="alert" className="text-bg/80">The featured works couldn’t load. Reload the page to try again.</p>}
        {data?.length === 0 && <p className="text-bg/65">Nothing is featured right now.</p>}
        <div className="columns-2 gap-2 lg:columns-3 lg:gap-2.5">
          {featured.map((work, index) => (
            <div key={work.id} className="hang-in mb-2 break-inside-avoid lg:mb-2.5">
              <WorkCard work={work} onOpen={() => setOpenIndex(index)} />
            </div>
          ))}
        </div>
      </div>

      <Lightbox
        work={openIndex === null ? null : featured[openIndex]}
        onClose={() => setOpenIndex(null)}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
      />
    </section>
  )
}
