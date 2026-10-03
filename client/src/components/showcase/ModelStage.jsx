import { useEffect, useRef, useState } from 'react'
import { BUNNIES } from '../../data/stickers.js'
import { youtubeId } from '../../lib/publicWork.js'
import Lightbox from '../Lightbox.jsx'

// The big preview on the 3D Showcase (Figma node 23:1599). It shows one view
// of the model at a time: the interactive .glb, its turntable (an animated
// image), its poster, or one of the images and YouTube videos in its gallery.
// The thumbnails underneath switch between the views the model has, and only
// appear when it has more than one.
//
// Every picture and video view can also be opened full screen in the Lightbox
// (the Full screen button under it), and stepped through there. The .glb view stays in
// place: it already zooms, and the Lightbox can't spin it.

export default function ModelStage({ model }) {
  // The 3D view needs a .glb. Without one it's left out, unless there's
  // nothing else to show, when it stands in with "on its way".
  const hasOthers = Boolean(model.turntableUrl || model.posterUrl || model.gallery.length)
  // The turntable leads, as in the wireframe; then the .glb to spin, the
  // poster, and the gallery's passes.
  const views = [
    model.turntableUrl && { id: 'turntable', label: 'Turntable', thumb: model.turntableThumb, video: model.turntableVideo },
    (model.modelUrl || !hasOthers) && { id: 'model', label: '3D model' },
    model.posterUrl && { id: 'poster', label: 'Poster', thumb: model.posterUrl },
    ...model.gallery.map((item, index) => ({
      id: `gallery-${index}`,
      item,
      label: item.pass || item.caption || item.alt || `${item.kind === 'video' ? 'Video' : 'Image'} ${index + 1}`,
      pass: item.pass,
      thumb: item.thumbnailUrl,
    })),
  ].filter(Boolean)

  const [viewId, setViewId] = useState(views[0].id)
  const current = views.find((view) => view.id === viewId) ?? views[0]

  // A different model may not have the view that was open, so start over on
  // its first one.
  useEffect(() => setViewId(views[0].id), [model.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // The views the Lightbox can show, as the work-like objects it takes, and the
  // one open in it (or null when it's closed).
  const slides = views.filter((view) => view.id !== 'model').map((view) => toSlide(model, view))
  const [openIndex, setOpenIndex] = useState(null)
  const currentSlide = slides.findIndex((slide) => slide.id === current.id)
  const step = (by) => {
    setOpenIndex((index) => (index + by + slides.length) % slides.length)
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-ink/10 bg-ink/5 md:aspect-[16/10]">
        {/* Keyed, so swapping model or view fades the new one in. */}
        <div key={`${model.id}-${viewId}`} className="size-full motion-safe:animate-fade-in">
          <View model={model} view={current} />
        </div>
      </div>

      <Lightbox
        work={openIndex === null ? null : slides[openIndex]}
        onClose={() => setOpenIndex(null)}
        onPrev={slides.length > 1 ? () => step(-1) : undefined}
        onNext={slides.length > 1 ? () => step(1) : undefined}
        prevLabel="Previous view"
        nextLabel="Next view"
      />

      {/* Under the view, not over it, so it never covers a video's own controls. */}
      {(current.item?.caption || currentSlide !== -1) && (
        <div className="flex items-start justify-between gap-2">
          <p className="text-caption text-ink/65">{current.item?.caption}</p>
          {currentSlide !== -1 && (
            <button
              type="button"
              onClick={() => setOpenIndex(currentSlide)}
              aria-label={`View ${current.label.toLowerCase()} full screen`}
              className="inline-flex shrink-0 cursor-pointer items-center gap-0.5 py-0.5 text-caption font-medium text-primary underline-offset-2 hover:underline"
            >
              <ExpandIcon />
              Full screen
            </button>
          )}
        </div>
      )}

      {current.id === 'model' && model.modelUrl && (
        <p className="font-mono text-small text-ink/65 uppercase">Drag to rotate · scroll or pinch to zoom</p>
      )}

      {views.length > 1 && (
        <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Views">
          {views.map((view) => {
            const active = view.id === current.id
            return (
              <button
                key={view.id}
                type="button"
                aria-pressed={active}
                aria-label={view.label}
                onClick={() => setViewId(view.id)}
                className={`flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-sm bg-ink/5 font-mono text-small text-ink/65 uppercase transition-colors hover:bg-ink/10 ${
                  active ? 'border-2 border-primary text-primary shadow-[0_4px_6px_rgb(4_96_153/0.15)]' : 'border border-ink/10'
                }`}
              >
                {view.thumb ? (
                  <span className="relative block size-full">
                    <img src={view.thumb} alt="" loading="lazy" className="size-full object-cover" />
                    {(view.pass || view.id === 'turntable') && (
                      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 bg-ink/70 px-0.5 py-0.5 text-center text-bg">
                        {view.pass || 'Turntable'}
                      </span>
                    )}
                    {(view.item?.kind === 'video' || view.video) && (
                      <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-3 w-4 items-center justify-center rounded-sm bg-ink/70 text-small text-bg">▶</span>
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="px-1 text-center">{view.label}</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// One view in the shape the Lightbox shows: the model's title, the view's name
// where a work shows its category, and its caption underneath.
function toSlide(model, view) {
  const base = { id: view.id, title: model.title, category: view.label, year: null, description: view.item?.caption ?? '', width: null, height: null }
  if (view.id === 'turntable') {
    return model.turntableVideo
      ? { ...base, type: 'video', videoUrl: model.turntableUrl }
      : { ...base, type: 'image', imageUrl: model.turntableUrl, alt: `Turntable of ${model.title}` }
  }
  if (view.id === 'poster') return { ...base, type: 'image', imageUrl: model.posterUrl, alt: model.alt }
  return view.item.kind === 'video'
    ? { ...base, type: 'video', videoUrl: view.item.url }
    : { ...base, type: 'image', imageUrl: view.item.url, alt: view.item.alt || view.item.caption || `${model.title}, ${view.label}` }
}

// Four corner arrows pointing out.
function ExpandIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2h4v4M6 14H2v-4M14 2 9.5 6.5M2 14l4.5-4.5" />
    </svg>
  )
}

function View({ model, view }) {
  if (view.item?.kind === 'video') {
    const id = youtubeId(view.item.url)
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}`}
        title={view.label}
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        className="size-full border-0 bg-ink"
      />
    )
  }

  if (view.item) {
    return <img src={view.item.url} alt={view.item.alt || view.item.caption} className="size-full object-contain" />
  }

  if (view.id === 'turntable' && model.turntableVideo) {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${youtubeId(model.turntableUrl)}`}
        title={`Turntable of ${model.title}`}
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        className="size-full border-0 bg-ink"
      />
    )
  }

  if (view.id === 'turntable') {
    return <img src={model.turntableUrl} alt={`Turntable of ${model.title}`} className="size-full object-contain" />
  }

  if (view.id === 'poster') {
    return <img src={model.posterUrl} alt={model.alt} className="size-full object-cover" />
  }

  if (!model.modelUrl) {
    return <StillWorking>3D model of {model.title} on its way</StillWorking>
  }

  return <ModelViewer model={model} />
}

// The bunny asleep on its laptop stands in while a model isn't ready: either
// it hasn't been exported yet, or the file is still downloading.
function StillWorking({ children }) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-1.5 p-2 text-center">
      <img
        src={BUNNIES.workingHardly.src}
        alt=""
        className="w-[min(60%,18rem)] -rotate-3 drop-shadow-[0_6px_6px_rgb(11_21_51/0.2)] motion-safe:animate-pop-in"
      />
      <p className="font-mono text-small text-ink/65 uppercase">{children}</p>
    </div>
  )
}

// <model-viewer> is Google's web component for showing a .glb. It brings
// three.js with it, so it is only downloaded once a model actually needs it,
// not on every page of the site.
function ModelViewer({ model }) {
  const viewerRef = useRef(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    import('@google/model-viewer')
  }, [])

  // <model-viewer> fires "load" once the model is on screen. React doesn't
  // wire events on custom elements, so it is listened for directly.
  useEffect(() => {
    const viewer = viewerRef.current
    const done = () => setLoaded(true)
    viewer.addEventListener('load', done)
    return () => viewer.removeEventListener('load', done)
  }, [model.modelUrl])

  // The turntable spin never stops on its own, so it is left off for anyone
  // who has asked their system for less motion. They can still drag to rotate.
  const spin = !window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // A poster already shows while the model downloads; without one, the
  // sleeping bunny keeps the box from sitting empty.
  return (
    <div className="relative size-full">
      {!loaded && !model.posterUrl && (
        <div className="absolute inset-0">
          <StillWorking>Loading the model…</StillWorking>
        </div>
      )}
      <model-viewer
        ref={viewerRef}
        key={model.modelUrl}
        src={model.modelUrl}
        poster={model.posterUrl ?? undefined}
        alt={model.alt}
        camera-controls=""
        {...(spin && { 'auto-rotate': '' })}
        touch-action="pan-y"
        shadow-intensity="1"
        style={{ width: '100%', height: '100%', '--poster-color': 'transparent' }}
      />
    </div>
  )
}
