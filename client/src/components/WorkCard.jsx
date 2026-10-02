import Placeholder from './Placeholder.jsx'
import PlayIcon from './PlayIcon.jsx'

// One piece of work in a grid. Clicking it calls onOpen, which shows the Lightbox.

// Video cards look like every other card until hovered (or focused from the
// keyboard), when they turn navy with an orange tag and play badge.
const DARK_ON_HOVER = {
  card: 'hover:border-bg/15 hover:bg-ink hover:text-bg focus-visible:border-bg/15 focus-visible:bg-ink focus-visible:text-bg',
  placeholder: 'group-hover:bg-ink group-hover:text-bg/65 group-focus-visible:bg-ink group-focus-visible:text-bg/65',
  category: 'group-hover:text-accent group-focus-visible:text-accent',
  play: 'group-hover:bg-accent group-hover:text-ink group-focus-visible:bg-accent group-focus-visible:text-ink',
}

export default function WorkCard({ work, onOpen }) {
  const isVideo = work.type === 'video'

  // The ratio comes from data, so it is set inline: Tailwind only generates
  // classes it can see written out in the source, never ones built at runtime.
  const ratio = { aspectRatio: `${work.width} / ${work.height}` }

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group block w-full cursor-pointer overflow-hidden rounded-lg border border-ink/10 bg-surface text-left text-ink transition-colors ${
        isVideo ? DARK_ON_HOVER.card : 'hover:border-ink/25'
      }`}
    >
      {work.imageUrl ? (
        <img src={work.imageUrl} alt="" loading="lazy" className="w-full object-cover" style={ratio} />
      ) : (
        <Placeholder
          label={work.title}
          decorative
          style={ratio}
          className={`transition-colors ${isVideo ? DARK_ON_HOVER.placeholder : ''}`}
        >
          {isVideo ? <PlayIcon className={DARK_ON_HOVER.play} /> : undefined}
        </Placeholder>
      )}

      <span className="flex flex-col gap-0.5 px-2 py-1.5 md:flex-row md:items-center md:justify-between">
        <span className="font-medium group-hover:underline">{work.title}</span>
        <span className={`font-mono text-small text-primary uppercase transition-colors ${isVideo ? DARK_ON_HOVER.category : ''}`}>
          {work.category}
        </span>
      </span>
    </button>
  )
}
