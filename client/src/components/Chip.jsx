// The Chip atom. `static` chips are plain labels (software tags); `outline`
// chips are the bordered style used for status badges.

const STYLES = {
  static: 'bg-primary/10 text-primary',
  outline: 'border border-ink/20 text-ink',
}

export default function Chip({ variant = 'static', className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-mono text-small uppercase ${STYLES[variant]} ${className}`}>
      {children}
    </span>
  )
}
