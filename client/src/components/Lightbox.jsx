import { useEffect, useRef } from 'react'
import IconButton from './IconButton.jsx'
import Placeholder from './Placeholder.jsx'
import PlayIcon from './PlayIcon.jsx'

// Full-screen view of one work, built on the native <dialog>. The browser
// handles Esc to close, keeps focus inside while open, and returns focus to
// the card that opened it.

export default function Lightbox({ work, onClose, onPrev, onNext }) {
  const dialogRef = useRef(null)

  // React renders the <dialog>; showModal() is what actually opens it.
  useEffect(() => {
    const dialog = dialogRef.current
    if (work && !dialog.open) dialog.showModal()
    if (!work && dialog.open) dialog.close()
  }, [work])

  function handleKeyDown(event) {
    if (event.key === 'ArrowLeft') onPrev()
    if (event.key === 'ArrowRight') onNext()
  }

  // A click on the <dialog> itself, not its contents, is a click on the backdrop.
  function handleClick(event) {
    if (event.target === dialogRef.current) onClose()
  }

  const isVideo = work?.type === 'video'

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      aria-labelledby="lightbox-title"
      className="m-auto w-full max-w-5xl bg-transparent p-2 backdrop:bg-ink/85"
    >
      {work && (
        <div className="flex flex-col gap-2 text-bg">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 id="lightbox-title" className="font-medium">{work.title}</h2>
              <p className="font-mono text-small text-bg/65 uppercase">
                {work.category} · {work.year}
              </p>
            </div>
            <IconButton label="Close" onClick={onClose} onDark>✕</IconButton>
          </div>

          {work.imageUrl ? (
            <img
              src={work.imageUrl}
              alt={`${work.title}, ${work.category}`}
              className="max-h-[70vh] w-full rounded-lg object-contain"
            />
          ) : (
            <Placeholder
              label={work.title}
              dark={isVideo}
              className={`max-h-[70vh] w-full rounded-lg ${isVideo ? 'border border-bg/10' : 'bg-surface'}`}
              style={{ aspectRatio: `${work.width} / ${work.height}` }}
            >
              {isVideo ? <PlayIcon size="lg" onDark /> : undefined}
            </Placeholder>
          )}

          <div className="flex items-center justify-between gap-2">
            <IconButton label="Previous work" onClick={onPrev} onDark>←</IconButton>
            <p className="text-center text-bg/65">{work.description}</p>
            <IconButton label="Next work" onClick={onNext} onDark>→</IconButton>
          </div>
        </div>
      )}
    </dialog>
  )
}
