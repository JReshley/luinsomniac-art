import { useEffect, useRef } from 'react'
import IconButton from './IconButton.jsx'
import Placeholder from './Placeholder.jsx'
import PlayIcon from './PlayIcon.jsx'
import ModelViewer from './showcase/ModelViewer.jsx'
import { FALLBACK_RATIO, imageProps, youtubeId } from '../lib/publicWork.js'

// Full-screen view of one work, built on the native <dialog>. The browser
// handles Esc to close, keeps focus inside while open, and returns focus to
// the card that opened it.
//
// The 3D Showcase uses it for one model's views, so the arrows' names can be
// changed, and they're left out when there's nothing to step to (no onPrev).
// Its .glb comes in as a slide of type 'model', which spins here as it does
// on the page.

export default function Lightbox({ work, onClose, onPrev, onNext, prevLabel = 'Previous work', nextLabel = 'Next work' }) {
  const dialogRef = useRef(null)
  // Where the last press started, so a drag that spins the model and lets go
  // over the backdrop isn't taken for a click on it.
  const pressedRef = useRef(null)

  // React renders the <dialog>; showModal() is what actually opens it.
  useEffect(() => {
    const dialog = dialogRef.current
    if (work && !dialog.open) dialog.showModal()
    if (!work && dialog.open) dialog.close()
  }, [work])

  function handleKeyDown(event) {
    // The model uses the arrow keys to turn itself while it has focus.
    if (event.target.tagName === 'MODEL-VIEWER') return
    if (event.key === 'ArrowLeft') onPrev?.()
    if (event.key === 'ArrowRight') onNext?.()
  }

  // A click on the <dialog> itself, not its contents, is a click on the backdrop.
  function handleClick(event) {
    if (event.target === dialogRef.current && pressedRef.current === dialogRef.current) onClose()
  }

  const isVideo = work?.type === 'video'
  const videoId = isVideo ? youtubeId(work.videoUrl) : null
  const ratio = work?.width && work?.height ? `${work.width} / ${work.height}` : FALLBACK_RATIO

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      onPointerDown={(event) => { pressedRef.current = event.target }}
      aria-labelledby="lightbox-title"
      // Like the other navy bands, the focus ring turns orange: blue on navy
      // fails contrast. The backdrop is near-solid so the page behind doesn't
      // show through under the caption.
      className="m-auto w-full max-w-5xl bg-transparent p-2 backdrop:bg-ink/95 motion-safe:backdrop:animate-fade-in **:focus-visible:outline-accent"
    >
      {work && (
        // The frame swings in when the Lightbox opens; stepping between works
        // only fades the picture (it is keyed, so each work remounts).
        <div className="flex flex-col gap-2 text-bg motion-safe:animate-pop-in">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 id="lightbox-title" className="font-medium">{work.title}</h2>
              <p className="font-mono text-small text-bg/65 uppercase">
                {[work.category, work.year].filter(Boolean).join(' · ')}
              </p>
            </div>
            <IconButton label="Close" onClick={onClose} onDark>✕</IconButton>
          </div>

          {work.type === 'model' ? (
            <div key={work.id} className="h-[70vh] w-full rounded-lg bg-bg/5 motion-safe:animate-fade-in">
              <ModelViewer modelUrl={work.modelUrl} posterUrl={work.posterUrl} alt={work.alt} onDark />
            </div>
          ) : videoId ? (
            // No autoplay: it starts when the visitor presses play.
            <iframe
              key={work.id}
              src={`https://www.youtube-nocookie.com/embed/${videoId}`}
              title={work.title}
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              className="aspect-video max-h-[70vh] w-full rounded-lg border-0 bg-ink motion-safe:animate-fade-in"
            />
          ) : work.imageUrl ? (
            <img
              key={work.id}
              // Up to 1024px wide (max-w-5xl): a phone takes the 800 or 1200,
              // a large or high-density screen the full 2000.
              {...imageProps(work.imageUrl, '(min-width: 64rem) 1024px, 100vw')}
              alt={work.alt || `${work.title}, ${work.category}`}
              className="max-h-[70vh] w-full rounded-lg object-contain motion-safe:animate-fade-in"
            />
          ) : (
            <Placeholder
              key={work.id}
              label={work.title}
              dark={isVideo}
              className={`max-h-[70vh] w-full rounded-lg motion-safe:animate-fade-in ${isVideo ? 'border border-bg/10' : 'bg-surface'}`}
              style={{ aspectRatio: ratio }}
            >
              {isVideo ? <PlayIcon size="lg" onDark /> : undefined}
            </Placeholder>
          )}

          <div className="flex items-center justify-between gap-2">
            {onPrev ? <IconButton label={prevLabel} onClick={onPrev} onDark>←</IconButton> : <span />}
            <p className="text-center text-bg/65">{work.description}</p>
            {onNext ? <IconButton label={nextLabel} onClick={onNext} onDark>→</IconButton> : <span />}
          </div>
        </div>
      )}
    </dialog>
  )
}
