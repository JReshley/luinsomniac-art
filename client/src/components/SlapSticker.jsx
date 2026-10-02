// A bunny sticker slapped onto the page: it lands with a squash as it scrolls
// into view (styles.css, .slap-in) and wobbles when it's hovered.
//
//   sticker    one of BUNNIES from data/stickers.js
//   tilt       how far it sits off straight, as a CSS angle
//   className  where it goes and how big it is. Its parent has to be
//              positioned for absolute placement to work.
//
// The stickers are decoration, so screen readers skip them.

export default function SlapSticker({ sticker, tilt = '0deg', className = '' }) {
  return (
    <span aria-hidden="true" className={`slap-in block select-none ${className}`} style={{ rotate: tilt }}>
      <img
        src={sticker.src}
        alt=""
        loading="lazy"
        draggable="false"
        className="block w-full drop-shadow-[0_4px_4px_rgb(11_21_51/0.25)] motion-safe:hover:animate-boing"
        style={{ aspectRatio: sticker.ratio }}
      />
    </span>
  )
}
