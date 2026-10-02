// Stands in for an image or video that doesn't exist yet. Swap it for the real
// <img> or <iframe> when the asset is ready.
//
// Pass `decorative` when nearby text already names the work (like a card
// title), so screen readers don't hear the name twice.

export default function Placeholder({ label, dark = false, decorative = false, className = '', style, children }) {
  const a11y = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label }

  // A <span> rather than a <div> so it is allowed inside a <button>.
  return (
    <span
      {...a11y}
      style={style}
      className={`relative flex items-center justify-center ${dark ? 'bg-ink text-bg/65' : 'bg-ink/5 text-ink/65'} ${className}`}
    >
      {children ?? <span className="px-1 text-center font-mono text-small uppercase">{label}</span>}
    </span>
  )
}
