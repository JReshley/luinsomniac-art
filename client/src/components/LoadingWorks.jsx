import { ALIEN } from '../data/stickers.js'

// Stands in for a section whose works are still on their way from the
// database: the pixel alien marches across the top while grey cards hold the
// places the works will take, so nothing jumps when they arrive.
//
// It waits a moment before showing (the fade-in's delay), so an answer that
// comes back quickly, from the CDN or the visit's own copy, never flashes it.

export default function LoadingWorks({ label, onDark = false, children }) {
  return (
    <div className="flex flex-col gap-2 motion-safe:animate-fade-in motion-safe:[animation-delay:200ms]">
      <AlienStatus label={label} onDark={onDark} />
      {children}
    </div>
  )
}

// The marching alien and what's loading, read out once by screen readers.
export function AlienStatus({ label, onDark = false }) {
  return (
    <div role="status" className="flex flex-col items-center gap-1">
      {/* A size container, so the march can be measured against its width. */}
      <div aria-hidden="true" className="flex w-full justify-center [container-type:inline-size]">
        <span
          className="alien block w-6 [image-rendering:pixelated]"
          style={{
            aspectRatio: ALIEN.ratio,
            backgroundImage: `url(${ALIEN.src})`,
            backgroundSize: '200% 100%',
          }}
        />
      </div>
      <p className={`font-mono text-small uppercase ${onDark ? 'text-bg/65' : 'text-ink/65'}`}>{label}</p>
    </div>
  )
}

// Card-shaped blanks in the same masonry columns as the real grid. The shapes
// vary, as the works do, so it reads as a gallery rather than a table.
const SHAPES = ['4 / 5', '1 / 1', '3 / 4', '4 / 3', '5 / 4', '3 / 5', '1 / 1', '4 / 5']

export function SkeletonCards({ count = 6, onDark = false, className = '', itemClassName = 'mb-2 lg:mb-2.5' }) {
  const fill = onDark ? 'bg-bg/10' : 'bg-ink/5'
  return (
    <div aria-hidden="true" className={className}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`break-inside-avoid ${itemClassName}`}>
          <div className={`overflow-hidden rounded-lg border ${onDark ? 'border-bg/10' : 'border-ink/10'}`}>
            <div className={`${fill} motion-safe:animate-pulse`} style={{ aspectRatio: SHAPES[i % SHAPES.length] }} />
            <div className="flex flex-col gap-0.5 px-2 py-1.5">
              <div className={`h-1.5 w-3/5 rounded-sm ${fill}`} />
              <div className={`h-1 w-1/4 rounded-sm ${fill}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
