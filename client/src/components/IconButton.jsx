// A 40 × 40px button showing only an icon. `label` is required because the
// icon alone tells a screen reader nothing.

export default function IconButton({ label, onClick, onDark = false, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm border ${
        onDark ? 'border-bg/25 text-bg hover:bg-bg/10' : 'border-ink/20 text-ink hover:bg-ink/5'
      }`}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  )
}
