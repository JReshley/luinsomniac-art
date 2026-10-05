import { useMemo, useState } from 'react'
import { usePublicData } from '../api/publicData.js'
import { toCard } from '../lib/publicWork.js'
import Button from '../components/Button.jsx'
import Lightbox from '../components/Lightbox.jsx'
import WorkCard from '../components/WorkCard.jsx'
import FilterBar from '../components/museum/FilterBar.jsx'
import DisplayTitle from '../components/DisplayTitle.jsx'
import LoadingWorks, { SkeletonCards } from '../components/LoadingWorks.jsx'
import { CATS } from '../data/stickers.js'

const ALL = 'All'

// How many works show before "Load more" (and how many each click adds).
const PAGE_SIZE = 8

// The tabby in its box marks the end of the halls once everything is showing.
const END_CAT = CATS.find((cat) => cat.id === 'tilapia').src

export default function Museum() {
  const { data: works, error } = usePublicData('works')
  // In the order set in the admin, and only categories with published work.
  const { data: categories } = usePublicData('categories')

  // Newest first. sort() is stable, so works from the same year keep the order
  // set in the admin. A work with no year goes last.
  const sorted = useMemo(() => (works ?? []).map(toCard).sort((a, b) => (b.year ?? 0) - (a.year ?? 0)), [works])
  const filters = [ALL, ...(categories ?? []).map((category) => category.name)]

  const [filter, setFilter] = useState(ALL)
  const [search, setSearch] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  // Index into `shown` of the work in the Lightbox, or null when it is closed.
  const [openIndex, setOpenIndex] = useState(null)

  const matching = (filter === ALL ? sorted : sorted.filter((work) => work.categories.includes(filter)))
  .filter((work) => work.title.toLowerCase().includes(search.toLowerCase()))
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

      <FilterBar options={filters} active={filter} onChange={changeFilter} />

      <div className="flex flex-col gap-1">
  <label htmlFor="work-search" className="text-small font-medium text-ink">
    Search works
  </label>
  <input
    id="work-search"
    type="search"
    value={search}
    onChange={(event) => {
      setSearch(event.target.value)
      setVisibleCount(PAGE_SIZE)
    }}
    placeholder="Search by title..."
    className="w-full rounded border border-ink/20 bg-white px-3 py-2 text-ink outline-none focus:border-primary"
  />
</div>

      {/* Announces the new count when a filter or "Load more" changes the grid. */}
      <p aria-live="polite" className="sr-only">
        Showing {shown.length} of {matching.length} works
      </p>

      {error && !works && <p role="alert" className="text-ink/80">The works couldn’t load. Reload the page to try again.</p>}
      {works?.length === 0 && <p className="text-ink/65">Nothing is on display yet. Check back soon.</p>}
      {works?.length > 0 && matching.length === 0 && (
  <p className="text-ink/65">No works match your search.</p>
)}
      {!works && !error && (
        <LoadingWorks label="Beaming in the collection…">
          <SkeletonCards count={PAGE_SIZE} className="columns-2 gap-2 md:columns-3 lg:columns-4 lg:gap-2.5" />
        </LoadingWorks>
      )}

      {/* CSS columns give the masonry layout: cards fill each column top to bottom. */}
      <div className="columns-2 gap-2 md:columns-3 lg:columns-4 lg:gap-2.5">
        {shown.map((work, index) => (
          <div key={work.id} className="hang-in mb-2 break-inside-avoid lg:mb-2.5">
            <WorkCard work={work} onOpen={() => setOpenIndex(index)} sizes="(min-width: 64rem) 25vw, (min-width: 48rem) 33vw, 50vw" />
          </div>
        ))}
      </div>

      {!works ? null : visibleCount < matching.length ? (
        <div className="flex justify-center pt-1">
          <Button variant="outline" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="w-full md:w-auto">
            Load more
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 pt-2 text-center">
          <img
            src={END_CAT}
            alt=""
            loading="lazy"
            className="w-[7rem] -rotate-3 drop-shadow-[0_4px_4px_rgb(11_21_51/0.2)] motion-safe:hover:animate-boing md:w-[8.5rem]"
          />
          <p className="font-mono text-small text-ink/65 uppercase">End of the halls · that&rsquo;s everything on display</p>
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
