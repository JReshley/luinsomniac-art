import { useState } from 'react'
import { WORKS } from '../../data/works.js'
import Button from '../Button.jsx'
import Lightbox from '../Lightbox.jsx'
import SectionHeader from '../SectionHeader.jsx'
import WorkCard from '../WorkCard.jsx'

const FEATURED = WORKS.filter((work) => work.featured)

export default function FeaturedWorks() {
  // Index of the work shown in the Lightbox, or null when it is closed.
  const [openIndex, setOpenIndex] = useState(null)

  // Wraps around, so "next" on the last work goes back to the first.
  function step(direction) {
    setOpenIndex((index) => (index + direction + FEATURED.length) % FEATURED.length)
  }

  return (
    // The blue focus ring fails contrast on navy, so it turns orange inside this band.
    <section className="bg-ink px-2 py-6 md:px-3 lg:px-5 lg:py-8 **:focus-visible:outline-accent">
      <div className="mx-auto flex max-w-page flex-col gap-4">
        <SectionHeader
          title="Featured in the Museum"
          description="A mix of modeling, backgrounds and finished frames."
          onDark
          action={<Button variant="outline" onDark href="/museum">Enter the Museum →</Button>}
        />

        {/* CSS columns give the masonry layout: cards fill each column top to bottom. */}
        <div className="columns-2 gap-2 lg:columns-3 lg:gap-2.5">
          {FEATURED.map((work, index) => (
            <div key={work.id} className="mb-2 break-inside-avoid lg:mb-2.5">
              <WorkCard work={work} onOpen={() => setOpenIndex(index)} />
            </div>
          ))}
        </div>
      </div>

      <Lightbox
        work={openIndex === null ? null : FEATURED[openIndex]}
        onClose={() => setOpenIndex(null)}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
      />
    </section>
  )
}
