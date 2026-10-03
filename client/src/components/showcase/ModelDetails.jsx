import { forwardRef } from 'react'
import Button from '../Button.jsx'
import Chip from '../Chip.jsx'
import { formatTris } from '../../lib/publicWork.js'

// The facts panel beside the preview on the 3D Showcase (Figma node 23:1611).
// From lg up it sticks below the header while the preview scrolls.
//
// The ref lands on the title, so the page can move focus there when a
// different model is picked from the grid.

const ModelDetails = forwardRef(function ModelDetails({ model }, titleRef) {
  // A spec the admin left blank isn't listed, rather than shown as "null".
  const specs = [
    model.software.length > 0 && { label: 'Software', value: model.software.join(', ') },
    model.polyCount != null && { label: 'Poly count', value: `${formatTris(model.polyCount)} tris` },
    { label: 'Textured', value: model.textured ? 'Yes' : 'No' },
  ].filter(Boolean)

  const external = externalLink(model.externalUrl)

  return (
    <aside className="flex flex-col gap-0.5 rounded-lg border border-ink/10 bg-surface p-2.5 lg:sticky lg:top-11 lg:w-[300px] lg:shrink-0">
      <h2 ref={titleRef} tabIndex={-1} className="text-[1.25rem] leading-[1.3] font-semibold focus-visible:outline-none">
        {model.title}
      </h2>
      <p className="font-mono text-small text-primary uppercase">
        {[model.category, model.year].filter(Boolean).join(' · ')}
      </p>

      <dl className="mt-1.5 flex flex-col gap-1">
        {specs.map((spec) => (
          <div key={spec.label} className="flex items-baseline justify-between gap-2 border-b border-ink/10 pb-1 last:border-b-0 last:pb-0">
            <dt className="font-mono text-small text-ink/65 uppercase">{spec.label}</dt>
            <dd className="text-right text-caption">{spec.value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-1.5 text-caption text-ink/65">{model.description}</p>

      {model.tags.length > 0 && (
        <ul className="mt-1 flex flex-wrap gap-0.5" aria-label="Tags">
          {model.tags.map((tag) => (
            <li key={tag}>
              <Chip className="px-1.5 py-0.5">{tag}</Chip>
            </li>
          ))}
        </ul>
      )}

      {model.processNotes && (
        <details className="group mt-1 text-caption">
          <summary className="cursor-pointer font-medium text-primary hover:underline">Process notes</summary>
          <p className="mt-1 text-ink/65">{model.processNotes}</p>
        </details>
      )}

      {external && (
        <Button
          href={model.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${external} (opens in a new tab)`}
          className="mt-2 w-full"
        >
          {external}
        </Button>
      )}
    </aside>
  )
})

export default ModelDetails

// Names the button after where the link goes.
function externalLink(url) {
  if (!url) return null
  if (url.includes('sketchfab.com')) return 'View on Sketchfab'
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'Watch on YouTube'
  return 'View project'
}
