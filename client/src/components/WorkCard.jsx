import Placeholder from './Placeholder.jsx'
import PlayIcon from './PlayIcon.jsx'

// One piece of work in a grid. Clicking it calls onOpen, which shows the Lightbox.

export default function WorkCard({ work, onOpen }) {
  const isVideo = work.type === 'video'

  // The ratio comes from data, so it is set inline: Tailwind only generates
  // classes it can see written out in the source, never ones built at runtime.
  const ratio = { aspectRatio: `${work.width} / ${work.height}` }

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group block w-full cursor-pointer overflow-hidden rounded-lg border text-left ${
        isVideo ? 'border-bg/15 bg-ink text-bg' : 'border-ink/10 bg-surface text-ink hover:border-ink/25'
      }`}
    >
      {work.imageUrl ? (
        <img src={work.imageUrl} alt="" loading="lazy" className="w-full object-cover" style={ratio} />
      ) : (
        <Placeholder label={work.title} dark={isVideo} decorative style={ratio}>
          {isVideo ? <PlayIcon /> : undefined}
        </Placeholder>
      )}

      <span className="flex flex-col gap-0.5 px-2 py-1.5 md:flex-row md:items-center md:justify-between">
        <span className="font-medium group-hover:underline">{work.title}</span>
        <span className={`font-mono text-small uppercase ${isVideo ? 'text-accent' : 'text-primary'}`}>
          {work.category}
        </span>
      </span>
    </button>
  )
}
