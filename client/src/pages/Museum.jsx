import { useState } from 'react'
import { WORKS } from '../data/works.js'
import Button from '../components/Button.jsx'
import Lightbox from '../components/Lightbox.jsx'
import WorkCard from '../components/WorkCard.jsx'
import FilterBar from '../components/museum/FilterBar.jsx'
import DisplayTitle from '../components/DisplayTitle.jsx'

const ALL = 'All'

// Filter order from the wireframe. A category with no works is left out.
const CATEGORY_ORDER = ['3D', 'Props', 'Background', 'Character', '2D art', 'Animation']
const FILTERS = [ALL, ...CATEGORY_ORDER.filter((category) => WORKS.some((work) => work.category === category))]

// Newest first. sort() is stable, so works from the same year keep their data order.
const SORTED = [...WORKS].sort((a, b) => b.year - a.year)

// How many works show before "Load more" (and how many each click adds).
const PAGE_SIZE = 8

export default function Museum() {
  const [filter, setFilter] = useState(ALL)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  // Index into `shown` of the work in the Lightbox, or null when it is closed.
  const [openIndex, setOpenIndex] = useState(null)

  const matching = filter === ALL ? SORTED : SORTED.filter((work) => work.category === filter)
  const shown = matching.slice(0, visibleCount)

  function changeFilter(next) {
    setFilter(next)
    setVisibleCount(PAGE_SIZE)
  }

  // Wraps around, and only steps through the works currently on screen.
  function step(direction) {
    setOpenIndex((index) => (index + direction + shown.length) % shown.length)
  }

  return (
    <main id="main" className="mx-auto flex max-w-page flex-col gap-3 px-2 pt-4 pb-6 md:px-3 lg:px-5 lg:pt-6.5 lg:pb-9.5">
      <div className="flex flex-col gap-1">
        <DisplayTitle text="The Museum" entrance className="font-display text-display text-primary" />
        <p className="text-ink/65">Wander the halls and see what's on display.</p>
      </div>

      <FilterBar options={FILTERS} active={filter} onChange={changeFilter} />

      {/* Announces the new count when a filter or "Load more" changes the grid. */}
      <p aria-live="polite" className="sr-only">
        Showing {shown.length} of {matching.length} works
      </p>

      {/* CSS columns give the masonry layout: cards fill each column top to bottom. */}
      <div className="columns-2 gap-2 md:columns-3 lg:columns-4 lg:gap-2.5">
        {shown.map((work, index) => (
          <div key={work.id} className="hang-in mb-2 break-inside-avoid lg:mb-2.5">
            <WorkCard work={work} onOpen={() => setOpenIndex(index)} />
          </div>
        ))}
      </div>

      {visibleCount < matching.length && (
        <div className="flex justify-center pt-1">
          <Button variant="outline" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="w-full md:w-auto">
            Load more
          </Button>
        </div>
      )}

      <Lightbox
        work={openIndex === null ? null : shown[openIndex]}
        onClose={() => setOpenIndex(null)}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
      />
    </main>
  )
}
