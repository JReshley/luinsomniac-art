import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CATS, CAT_RATIO } from '../../data/stickers.js'

// The sticker sheet on the home page. Visitors peel a cat off the sheet and
// stick it anywhere on the page, artwork included. The page's <main> is the
// board: stickers can't be dragged out of it (onto the header or footer).
// Dragging near the top or bottom of the window scrolls the page, so a
// sticker can be carried anywhere. Dropping one back on the sheet puts it
// back in its slot.
//
//   useStickerBoard()  the shared state; give boardRef to the <main>
//   <StickerSheet />   the sheet the cats start on (in StickerSection.jsx)
//   <StickerLayer />   where peeled stickers live, laid over the whole board
//
// Positions are saved as a share of the board's width and height (so they
// survive the layout reflowing) in this browser only, so a visitor's
// stickers are still where they left them next time.
//
// The stickers are decoration, so screen readers skip them and they take no
// keyboard focus. Nothing on the page depends on them.

const STORAGE_KEY = 'luinsomniac:stickers:home'

// Where each cat sits on the sheet (left and top as % of the sheet) and how
// far it leans, so the sheet looks laid out by hand rather than on a grid.
// The bottom-right corner is kept free for the "Peel & stick" label.
const SLOTS = {
  calc: { left: 4, top: 4, tilt: -7 },
  jiji: { left: 37, top: 2, tilt: 4 },
  orinds: { left: 70, top: 5, tilt: -3 },
  tilapia: { left: 20, top: 35, tilt: 6 },
  tost: { left: 53, top: 34, tilt: -5 },
  waiter: { left: 4, top: 65, tilt: 3 },
  white: { left: 37, top: 64, tilt: -6 },
}

// The sheet itself sits at a slight angle, like it was tossed on the wall.
const SHEET_TILT = -2

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Storage can be missing or blocked (private windows, blocked site data), and
// a saved value can be stale, so anything odd just means "all on the sheet".
function loadPlaced() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}
    const placed = {}
    for (const cat of CATS) {
      const spot = saved[cat.id]
      if (spot && [spot.x, spot.y, spot.r, spot.z].every(Number.isFinite)) placed[cat.id] = spot
    }
    return placed
  } catch {
    return {}
  }
}

function savePlaced(placed) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(placed))
  } catch {
    // Not saved this time; the stickers still work for this visit.
  }
}

export function useStickerBoard() {
  const boardRef = useRef(null)
  const sheetRef = useRef(null)
  // The peeled-sticker elements by cat id, for moving them without re-rendering.
  const stickerEls = useRef({})
  // The sticker in hand: which one, and where on it the pointer grabbed it.
  const drag = useRef(null)

  // Cat id -> { x, y } (centre, as a share of the board), r (lean in degrees)
  // and z (stacking order, so the last one stuck goes on top).
  const [placed, setPlaced] = useState(loadPlaced)
  const [draggingId, setDraggingId] = useState(null)

  useEffect(() => savePlaced(placed), [placed])

  function pickUp(id, event, lean) {
    if (event.button !== 0) return
    // Stops the browser selecting text or dragging a ghost of the image.
    event.preventDefault()

    const rect = event.currentTarget.getBoundingClientRect()
    drag.current = {
      id,
      // The pointer stays this far from the sticker's centre while it moves.
      offsetX: event.clientX - (rect.left + rect.width / 2),
      offsetY: event.clientY - (rect.top + rect.height / 2),
      startX: event.clientX,
      startY: event.clientY,
      // The size it was picked up at (small on the sheet), to grow from.
      startWidth: event.currentTarget.offsetWidth,
      lean,
      lastX: event.clientX,
      tilt: 0,
    }
    setDraggingId(id)
  }

  // Moves the sticker so the grabbed spot stays under the pointer, kept inside
  // the board. Returns its centre as a share of the board.
  function moveTo(el, clientX, clientY) {
    const { offsetX, offsetY } = drag.current
    const board = boardRef.current.getBoundingClientRect()
    const halfW = el.offsetWidth / 2
    const halfH = el.offsetHeight / 2
    const x = clamp(clientX - offsetX - board.left, halfW, board.width - halfW) / board.width
    const y = clamp(clientY - offsetY - board.top, halfH, board.height - halfH) / board.height
    el.style.left = `${x * 100}%`
    el.style.top = `${y * 100}%`
    return { x, y }
  }

  // The frame a sticker is picked up: start it exactly where and how big it
  // was, then let it grow and lift towards the pointer. Runs before paint, so
  // a sticker coming off the sheet never flashes at full size.
  useLayoutEffect(() => {
    if (!draggingId) return
    const el = stickerEls.current[draggingId]
    const d = drag.current

    el.style.transition = 'none'
    el.style.scale = String(d.startWidth / el.offsetWidth)
    el.style.rotate = `${d.lean}deg`
    moveTo(el, d.startX, d.startY)

    // Commit that starting point, then hand back to the CSS transitions, which
    // grow it to its lifted size (.sticker--lifted) and straighten it.
    el.getBoundingClientRect()
    el.style.transition = ''
    el.style.scale = ''
    el.style.rotate = '0deg'
  }, [draggingId])

  // While a sticker is in hand, follow the pointer anywhere on the page, not
  // just over the sticker, so a fast flick can't drop it.
  useEffect(() => {
    if (!draggingId) return
    const el = stickerEls.current[draggingId]
    const d = drag.current
    const swing = !prefersReducedMotion()
    const pointer = { x: d.startX, y: d.startY }
    let settle
    let scrolling

    // Near the top or bottom of the window the page scrolls, faster the closer
    // the pointer gets to the edge, carrying the sticker along. Starts on the
    // first move, so just picking a sticker up never scrolls the page.
    function autoScroll() {
      const zone = Math.min(120, window.innerHeight * 0.15)
      const fromBottom = window.innerHeight - pointer.y
      const speed =
        pointer.y < zone ? -(zone - pointer.y) / zone : fromBottom < zone ? (zone - fromBottom) / zone : 0
      if (speed) {
        window.scrollBy({ top: speed * 18, behavior: 'instant' })
        moveTo(el, pointer.x, pointer.y)
      }
      scrolling = requestAnimationFrame(autoScroll)
    }

    function onMove(event) {
      pointer.x = event.clientX
      pointer.y = event.clientY
      scrolling ??= requestAnimationFrame(autoScroll)
      moveTo(el, event.clientX, event.clientY)
      if (!swing) return

      // It leans into the direction it's being pulled, like paper held by one
      // corner, and swings back upright once the pointer stops.
      d.tilt = clamp(d.tilt * 0.6 + (event.clientX - d.lastX) * 0.9, -18, 18)
      d.lastX = event.clientX
      el.style.rotate = `${d.tilt}deg`
      clearTimeout(settle)
      settle = setTimeout(() => {
        d.tilt = 0
        el.style.rotate = '0deg'
      }, 90)
    }

    function onDrop(event) {
      clearTimeout(settle)
      cancelAnimationFrame(scrolling)
      const sheet = sheetRef.current.getBoundingClientRect()
      const overSheet =
        event.clientX >= sheet.left &&
        event.clientX <= sheet.right &&
        event.clientY >= sheet.top &&
        event.clientY <= sheet.bottom

      if (overSheet) {
        // Back in its slot: the peeled copy goes away and the sheet shows it again.
        setPlaced(({ [d.id]: _, ...rest }) => rest)
      } else {
        // Stuck down at a fresh angle, on top of the others. The scale
        // transition's spring makes it overshoot and settle as it lands.
        const spot = moveTo(el, event.clientX, event.clientY)
        const r = Math.round(Math.random() * 20 - 10)
        el.style.rotate = `${r}deg`
        setPlaced((current) => {
          const z = Math.max(0, ...Object.values(current).map((other) => other.z)) + 1
          return { ...current, [d.id]: { ...spot, r, z } }
        })
      }
      setDraggingId(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onDrop)
    window.addEventListener('pointercancel', onDrop)
    return () => {
      clearTimeout(settle)
      cancelAnimationFrame(scrolling)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onDrop)
      window.removeEventListener('pointercancel', onDrop)
    }
  }, [draggingId])

  return {
    boardRef,
    sheetRef,
    stickerEls,
    placed,
    draggingId,
    pickUp,
    putAllBack: () => setPlaced({}),
  }
}

// className sizes the sheet; its height follows from its width.
export function StickerSheet({ board, className = '' }) {
  const { sheetRef, placed, draggingId, pickUp, putAllBack } = board
  const anyPlaced = Object.keys(placed).length > 0

  return (
    <div
      ref={sheetRef}
      aria-hidden="true"
      className={`relative aspect-[18/11] shrink-0 rounded-lg bg-bg shadow-[0_12px_24px_-10px_rgb(0_0_0/0.45)] outline-1 -outline-offset-6 outline-ink/15 outline-dashed ${className}`}
      style={{ rotate: `${SHEET_TILT}deg` }}
    >
      {CATS.map((cat) => {
        const slot = SLOTS[cat.id]
        const peeled = placed[cat.id] || draggingId === cat.id
        const position = { left: `${slot.left}%`, top: `${slot.top}%`, rotate: `${slot.tilt}deg` }

        // A peeled cat leaves its outline behind, like the backing paper of a
        // real sheet. Remounting the image when it comes back plays the pop-in.
        return peeled ? (
          <img
            key={`${cat.id}-gap`}
            src={cat.src}
            alt=""
            draggable={false}
            className="absolute w-[25%] opacity-10 brightness-0 select-none"
            style={position}
          />
        ) : (
          <img
            key={cat.id}
            src={cat.src}
            alt=""
            draggable={false}
            onPointerDown={(event) => pickUp(cat.id, event, slot.tilt + SHEET_TILT)}
            className="sticker absolute w-[25%] cursor-grab touch-none select-none motion-safe:animate-pop-in"
            style={position}
          />
        )
      })}

      {/* Bottom-right corner: how to use it, or a way to undo once it's been used. */}
      <div className="absolute top-[70%] left-[69%] w-[28%] font-mono text-small text-ink/65 uppercase">
        {anyPlaced ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={putAllBack}
            className="cursor-pointer text-left uppercase underline-offset-2 hover:text-ink hover:underline"
          >
            ↺ Put them back
          </button>
        ) : (
          <span>Peel &amp; stick</span>
        )}
      </div>
    </div>
  )
}

export function StickerLayer({ board }) {
  const { stickerEls, placed, draggingId, pickUp } = board

  return (
    // Covers the whole board, under the sticky header. Clicks pass through to
    // the page everywhere except on a sticker itself.
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      {CATS.map((cat) => {
        const spot = placed[cat.id]
        const lifted = draggingId === cat.id
        if (!spot && !lifted) return null

        return (
          <div
            key={cat.id}
            ref={(el) => {
              stickerEls.current[cat.id] = el
            }}
            onPointerDown={(event) => pickUp(cat.id, event, spot?.r ?? 0)}
            className={`sticker sticker--peeled pointer-events-auto absolute w-[clamp(5.5rem,3.5rem+8vw,9rem)] cursor-grab touch-none select-none ${
              lifted ? 'sticker--lifted cursor-grabbing' : ''
            }`}
            style={{
              aspectRatio: CAT_RATIO,
              zIndex: lifted ? 1000 : spot.z,
              ...(spot && { left: `${spot.x * 100}%`, top: `${spot.y * 100}%`, rotate: `${spot.r}deg` }),
            }}
          >
            <img src={cat.src} alt="" draggable={false} className="block size-full" />
          </div>
        )
      })}
    </div>
  )
}
