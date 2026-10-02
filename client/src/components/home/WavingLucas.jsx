import { useEffect, useRef, useState } from 'react'
import still from '../../assets/lucas-rest.webp'
import wave from '../../assets/lucas-wave.webp'

// Both files were cut from the original wave GIF at 360×720 (the hero shows
// Lucas at 150px at most). The still is the animation's own first frame, and
// the last frame matches it, so swapping between them doesn't jump in pose or
// lighting. To rebuild them, resize every frame of a new animation and save the
// first one on its own plus all of them as one animated WebP, with the same
// quality settings.
// The animation is 72 frames at 40 ms (it's set to loop forever, so we cut it
// off ourselves after one pass).
const WAVE_MS = 72 * 40

// Rests on the still. Hovering or pressing swaps in the animation, which starts
// from its first frame, and swaps back after one pass. The file is fetched once
// and each play gets a fresh blob URL, because a fresh URL is the only way to
// make an <img> restart an animated image without downloading it again.
export default function WavingLucas({ className = '' }) {
  const [src, setSrc] = useState(still)
  const playing = useRef(false)
  const blob = useRef(null)
  const timer = useRef()
  const url = useRef()
  const live = useRef(true)

  useEffect(() => {
    live.current = true
    fetch(wave)
      .then((res) => res.blob())
      .then((data) => {
        if (live.current) blob.current = data
      })
      .catch(() => {})
    return () => {
      live.current = false
      clearTimeout(timer.current)
      if (url.current) URL.revokeObjectURL(url.current)
    }
  }, [])

  async function play(event) {
    // Nothing to play until the animation has downloaded.
    if (playing.current || !blob.current) return
    // Hovering is incidental, so reduced motion only plays it on a deliberate press.
    if (event.type === 'mouseenter' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    playing.current = true
    if (url.current) URL.revokeObjectURL(url.current)
    url.current = URL.createObjectURL(blob.current)

    // Decode before swapping, so the first frames don't stutter and the timer
    // starts when the animation actually starts.
    const next = new Image()
    next.src = url.current
    try {
      await next.decode()
    } catch {
      // Show it anyway. The browser decodes it on the way in.
    }
    if (!live.current) return

    setSrc(url.current)
    timer.current = setTimeout(() => {
      setSrc(still)
      playing.current = false
    }, WAVE_MS)
  }

  return (
    <button
      type="button"
      onMouseEnter={play}
      onClick={play}
      aria-label="Lucas, the 3D character. Press to see him wave."
      className={`block cursor-pointer ${className}`}
    >
      <img src={src} alt="" width="360" height="720" draggable="false" className="block h-auto w-full" />
    </button>
  )
}
