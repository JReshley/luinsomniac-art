import { useEffect, useRef, useState } from 'react'
import still from '../../assets/3d-character-lucas.png'
import wave from '../../assets/lucas-hi-animation.gif'

// The animation is 24 frames at 80 ms (it's set to loop forever, so we cut it
// off ourselves after one pass).
const WAVE_MS = 1920

// Rests on a still frame. Hovering or pressing swaps in the GIF, which starts
// from its first frame, and swaps back after one pass. The GIF is fetched once
// and each play gets a fresh blob URL, because a fresh URL is the only way to
// make an <img> restart a GIF without downloading it again.
export default function WavingLucas({ className = '' }) {
  const [src, setSrc] = useState(still)
  const playing = useRef(false)
  const blob = useRef(null)
  const timer = useRef()
  const url = useRef()

  useEffect(() => {
    let live = true
    fetch(wave)
      .then((res) => res.blob())
      .then((data) => {
        if (live) blob.current = data
      })
      .catch(() => {})
    return () => {
      live = false
      clearTimeout(timer.current)
      if (url.current) URL.revokeObjectURL(url.current)
    }
  }, [])

  function play(event) {
    if (playing.current) return
    // Hovering is incidental, so reduced motion only plays it on a deliberate press.
    if (event.type === 'mouseenter' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    playing.current = true
    if (url.current) URL.revokeObjectURL(url.current)
    url.current = blob.current ? URL.createObjectURL(blob.current) : `${wave}?t=${Date.now()}`
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
      <img src={src} alt="" draggable="false" className="block h-auto w-full" />
    </button>
  )
}
