// The orange play badge drawn over video placeholders.

export default function PlayIcon({ size = 'md' }) {
  const box = size === 'lg' ? 'h-6.5 w-9 rounded-sm' : 'h-5 w-6.5 rounded-sm'
  return (
    <span aria-hidden="true" className={`flex items-center justify-center bg-accent text-ink shadow-lg ${box}`}>
      ▶
    </span>
  )
}
