import { useEffect, useState } from 'react'
import Placeholder from '../Placeholder.jsx'

// The big preview on the 3D Showcase (Figma node 23:1599). It shows one view
// of the model at a time: the interactive .glb, its turntable video, or its
// poster. The thumbnails underneath switch between the views the model has,
// and only appear when it has more than one.

export default function ModelStage({ model }) {
  const views = [
    { id: 'model', label: '3D model' },
    model.turntableUrl && { id: 'turntable', label: 'Turntable' },
    model.posterUrl && { id: 'poster', label: 'Poster' },
  ].filter(Boolean)

  const [viewId, setViewId] = useState('model')

  // A different model may not have the view that was open, so start over.
  useEffect(() => setViewId('model'), [model.id])

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-ink/10 bg-ink/5 md:aspect-[16/10]">
        {/* Keyed, so swapping model or view fades the new one in. */}
        <div key={`${model.id}-${viewId}`} className="size-full motion-safe:animate-fade-in">
          <View model={model} viewId={viewId} />
        </div>
      </div>

      {viewId === 'model' && model.modelUrl && (
        <p className="font-mono text-small text-ink/65 uppercase">Drag to rotate · scroll or pinch to zoom</p>
      )}

      {views.length > 1 && (
        <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Views">
          {views.map((view) => {
            const active = view.id === viewId
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
                {view.id === 'poster' ? (
                  <img src={model.posterUrl} alt="" className="size-full object-cover" />
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

function View({ model, viewId }) {
  if (viewId === 'turntable') {
    return (
      <video
        key={model.turntableUrl}
        src={model.turntableUrl}
        poster={model.posterUrl ?? undefined}
        aria-label={`Turntable of ${model.title}`}
        controls
        loop
        muted
        playsInline
        className="size-full bg-ink object-contain"
      />
    )
  }

  if (viewId === 'poster') {
    return <img src={model.posterUrl} alt={model.alt} className="size-full object-cover" />
  }

  if (!model.modelUrl) {
    return <Placeholder label={`3D model · ${model.title}`} className="size-full" />
  }

  return <ModelViewer model={model} />
}

// <model-viewer> is Google's web component for showing a .glb. It brings
// three.js with it, so it is only downloaded once a model actually needs it,
// not on every page of the site.
function ModelViewer({ model }) {
  useEffect(() => {
    import('@google/model-viewer')
  }, [])

  // The turntable spin never stops on its own, so it is left off for anyone
  // who has asked their system for less motion. They can still drag to rotate.
  const spin = !window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <model-viewer
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
  )
}
