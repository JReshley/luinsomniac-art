import Placeholder from './Placeholder.jsx'
import PlayIcon from './PlayIcon.jsx'
import { FALLBACK_RATIO, imageProps } from '../lib/publicWork.js'

// One piece of work in a grid. Clicking it calls onOpen, which shows the Lightbox.
// The small label on the right is the work's category unless `meta` replaces it
// (the 3D Showcase shows the poly count there). `sizes` is how wide the card
// is in its grid, so its picture downloads at a size that fits (imageProps).

// Cards stay light until hovered (or focused from the keyboard), when they
// turn navy with an orange title (and an orange play badge on videos), and
// tilt up off the wall a little, like a print being lifted from its hook.
const DARK_ON_HOVER = {
  card:
    'hover:border-bg/15 hover:bg-ink hover:text-bg focus-visible:border-bg/15 focus-visible:bg-ink focus-visible:text-bg ' +
    'motion-safe:hover:-translate-y-0.5 motion-safe:hover:-rotate-1 motion-safe:focus-visible:-translate-y-0.5 motion-safe:focus-visible:-rotate-1 ' +
    'hover:shadow-[0_16px_24px_-12px_rgb(11_21_51/0.45)] focus-visible:shadow-[0_16px_24px_-12px_rgb(11_21_51/0.45)]',
  placeholder: 'group-hover:bg-ink group-hover:text-bg/65 group-focus-visible:bg-ink group-focus-visible:text-bg/65',
  title: 'group-hover:text-accent group-focus-visible:text-accent',
  category: 'group-hover:text-bg/65 group-focus-visible:text-bg/65',
  play: 'group-hover:bg-accent group-hover:text-ink group-focus-visible:bg-accent group-focus-visible:text-ink',
}

export default function WorkCard({ work, meta = work.category, onOpen, sizes = '50vw' }) {
  const isVideo = work.type === 'video'

  // The ratio comes from data, so it is set inline: Tailwind only generates
  // classes it can see written out in the source, never ones built at runtime.
  // A picture whose size isn't known (a Drive link) keeps its own shape; a
  // placeholder has none, so it gets 4:3.
  const ratio = work.width && work.height ? { aspectRatio: `${work.width} / ${work.height}` } : undefined

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group block w-full cursor-pointer overflow-hidden rounded-lg border border-ink/10 bg-surface text-left text-ink transition-[color,background-color,border-color,translate,rotate,box-shadow] duration-300 ease-spring ${DARK_ON_HOVER.card}`}
    >
      {work.imageUrl ? (
        <span className="relative block">
          <img {...imageProps(work.imageUrl, sizes)} alt="" loading="lazy" className="w-full object-cover" style={ratio} />
          {/* The picture is the video's cover, so it needs the badge too. */}
          {isVideo && (
            <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-5 w-6.5 items-center justify-center rounded-sm bg-ink/70 text-bg">▶</span>
            </span>
          )}
        </span>
      ) : (
        <Placeholder
          label={work.title}
          decorative
          style={ratio ?? { aspectRatio: FALLBACK_RATIO }}
          className={`transition-colors ${DARK_ON_HOVER.placeholder}`}
        >
          {isVideo ? <PlayIcon className={DARK_ON_HOVER.play} /> : undefined}
        </Placeholder>
      )}

      <span className="flex flex-col gap-0.5 px-2 py-1.5 md:flex-row md:items-center md:justify-between">
        <span className={`font-medium transition-colors group-hover:underline ${DARK_ON_HOVER.title}`}>{work.title}</span>
        <span className={`font-mono text-small text-primary uppercase transition-colors ${DARK_ON_HOVER.category}`}>
          {meta}
        </span>
      </span>
    </button>
  )
}
