import { useRef, useState } from 'react'
import Button from './Button.jsx'

// A Button with a bunny sticker hiding behind its top edge. Hovering (or
// focusing) the button brings the bunny up to look (styles.css, .peek).
//
//   sticker  one of BUNNIES from data/stickers.js
//   align    where along the top edge: 'center', 'left', 'right', or
//            'random', which picks a new spot (never the middle) each time
//            the bunny has ducked back down, so it pops up somewhere else
//   side     'top' (default), or 'bottom': the sticker hangs down from the
//            bottom edge, upside down
//   show     how much of the sticker comes up, 0–1. Under 1 it only peeks.
//   size     the sticker's width, as a CSS length
//
// The bunny sits in a window that ends at the button's top edge and clips
// anything below it, so it never shows through see-through outline buttons
// and seems to come up from behind them. Devices without hover never show
// it: a tap would flash it for a moment before the link goes.
//
// Everything else is passed to the Button. wrapperClassName sizes the box
// around it, which replaces the Button in its parent's layout.

const ALIGN = {
  center: 'left-1/2 -translate-x-1/2',
  left: 'left-[8%]',
  right: 'right-[8%]',
  random: '-translate-x-1/2',
}

// The bunny's centre, as % of the button's width: somewhere in the left or
// right third, never over the middle of the label.
function randomSpot() {
  const spot = 12 + Math.random() * 22
  return Math.random() < 0.5 ? spot : 100 - spot
}

// How long the bunny takes to duck back down (.peek's transition), so it
// only moves once it's out of sight.
const DUCK_MS = 400

export default function PeekButton({
  sticker,
  align = 'center',
  side = 'top',
  show = 1,
  size = '6.5rem',
  wrapperClassName = 'flex w-full md:w-auto',
  children,
  ...buttonProps
}) {
  const [spot, setSpot] = useState(randomSpot)
  const moving = useRef()

  // Where the sticker comes to rest when it's up. A sliver stays hidden
  // even at show = 1, so its die-cut border reads as tucked behind the button.
  const hidden = (1 - show) * 100 + 6
  const below = side === 'bottom'
  const rest = `${below ? -hidden : hidden}%`

  const shuffle =
    align === 'random'
      ? {
          onMouseEnter: () => clearTimeout(moving.current),
          onMouseLeave: () => {
            moving.current = setTimeout(() => setSpot(randomSpot()), DUCK_MS)
          },
        }
      : {}

  return (
    <span className={`peek-host relative ${wrapperClassName}`} {...shuffle}>
      <span
        aria-hidden="true"
        className={`peek-window pointer-events-none absolute overflow-hidden ${below ? 'top-full' : 'bottom-full'} ${ALIGN[align]}`}
        style={{ width: size, aspectRatio: sticker.ratio, ...(align === 'random' && { left: `${spot}%` }) }}
      >
        <img
          src={sticker.src}
          alt=""
          className={`peek absolute inset-0 size-full ${below ? 'rotate-180' : ''}`}
          style={{ '--peek-rest': rest, '--peek-hide': below ? '-105%' : '105%' }}
        />
      </span>
      <Button {...buttonProps}>{children}</Button>
    </span>
  )
}
