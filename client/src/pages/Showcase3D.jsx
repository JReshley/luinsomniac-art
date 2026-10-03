import { useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listPublishedWorks, useApi } from '../api/index.js'
import { formatTris, toModel } from '../lib/publicWork.js'
import SectionHeader from '../components/SectionHeader.jsx'
import WorkCard from '../components/WorkCard.jsx'
import ModelDetails from '../components/showcase/ModelDetails.jsx'
import ModelStage from '../components/showcase/ModelStage.jsx'
import DisplayTitle from '../components/DisplayTitle.jsx'

// The 3D Showcase body from the Figma wireframe (03 · 3D Showcase, node 23:1573):
// one model up front with its details beside it, and the rest in a grid below.
//
// The open model lives in the URL (/showcase?model=market-stall), so a model
// can be linked to directly and Back returns to the one before.

export default function Showcase3D() {
  const [searchParams, setSearchParams] = useSearchParams()
  const layoutRef = useRef(null)
  const titleRef = useRef(null)

  const { data, error } = useApi(() => listPublishedWorks({ kind: 'model' }), [])
  const models = useMemo(() => (data ?? []).map(toModel), [data])

  const model = models.find((m) => m.id === searchParams.get('model')) ?? models[0]
  const others = models.filter((m) => m.id !== model?.id)

  // Picking a card swaps the model at the top, so bring the viewer back into
  // view and move focus to the new title for keyboard and screen reader users.
  function open(id) {
    setSearchParams({ model: id })
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    layoutRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
    titleRef.current.focus({ preventScroll: true })
  }

  return (
    <main id="main" className="mx-auto flex max-w-5xl flex-col gap-1 px-2 pt-4 pb-7 md:px-3 lg:px-5 lg:pt-6.5 lg:pb-9.5">
      <DisplayTitle text="3D Showcase" entrance className="font-display text-display text-primary" />
      <p className="text-ink/65">Spin, zoom and look closer at each model.</p>

      {model ? (
        <>
          {/* scroll-mt keeps the viewer clear of the sticky header after open(). */}
          <div ref={layoutRef} className="mt-2.5 flex scroll-mt-11 flex-col gap-2 lg:flex-row lg:items-start lg:gap-3">
            <ModelStage model={model} />
            <ModelDetails ref={titleRef} model={model} />
          </div>

          {others.length > 0 && (
            <section className="mt-5 flex flex-col gap-2">
              <SectionHeader title="More models" />
              <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 lg:gap-2.5">
                {others.map((other) => (
                  <li key={other.id} className="hang-in">
                    <WorkCard
                      work={{ ...other, type: 'image', width: null, height: null, imageUrl: other.posterUrl }}
                      meta={other.polyCount == null ? other.category : `${formatTris(other.polyCount)} tris`}
                      onOpen={() => open(other.id)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        // Nothing to say until the models have arrived, or it would claim the
        // shelf is empty while still loading.
        data && (
          <p className="mt-2.5 rounded-lg border border-ink/10 bg-surface p-3 text-ink/65">
            No models are on display yet. Check back soon.
          </p>
        )
      )}
      {error && !data && (
        <p role="alert" className="mt-2.5 text-ink/80">The models couldn’t load. Reload the page to try again.</p>
      )}
    </main>
  )
}
