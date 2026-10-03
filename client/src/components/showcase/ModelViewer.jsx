import { useEffect, useRef, useState } from 'react'
import { BUNNIES } from '../../data/stickers.js'

// The bunny asleep on its laptop stands in while a model isn't ready: either
// it hasn't been exported yet, or the file is still downloading.
export function StillWorking({ children, onDark = false }) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-1.5 p-2 text-center">
      <img
        src={BUNNIES.workingHardly.src}
        alt=""
        className="w-[min(60%,18rem)] -rotate-3 drop-shadow-[0_6px_6px_rgb(11_21_51/0.2)] motion-safe:animate-pop-in"
      />
      <p className={`font-mono text-small uppercase ${onDark ? 'text-bg/65' : 'text-ink/65'}`}>{children}</p>
    </div>
  )
}

// <model-viewer> is Google's web component for showing a .glb. It brings
// three.js with it, so it is only downloaded once a model actually needs it,
// not on every page of the site. The 3D Showcase and the Lightbox both use it.
export default function ModelViewer({ modelUrl, posterUrl, alt, onDark = false }) {
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
  }, [modelUrl])

  // The turntable spin never stops on its own, so it is left off for anyone
  // who has asked their system for less motion. They can still drag to rotate.
  const spin = !window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // A poster already shows while the model downloads; without one, the
  // sleeping bunny keeps the box from sitting empty.
  return (
    <div className="relative size-full">
      {!loaded && !posterUrl && (
        <div className="absolute inset-0">
          <StillWorking onDark={onDark}>Loading the model…</StillWorking>
        </div>
      )}
      <model-viewer
        ref={viewerRef}
        key={modelUrl}
        src={modelUrl}
        poster={posterUrl ?? undefined}
        alt={alt}
        camera-controls=""
        {...(spin && { 'auto-rotate': '' })}
        touch-action="pan-y"
        shadow-intensity="1"
        style={{ width: '100%', height: '100%', '--poster-color': 'transparent' }}
      />
    </div>
  )
}
