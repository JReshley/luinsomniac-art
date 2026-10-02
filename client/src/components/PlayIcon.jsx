// The play badge drawn over video placeholders, so a video reads as one even
// before it has a thumbnail. It stays a quiet gray; a real YouTube thumbnail or
// embed brings its own play button instead. Pass onDark on navy backgrounds,
// and className to recolor it (WorkCard turns it orange on hover).

export default function PlayIcon({ size = 'md', onDark = false, className = '' }) {
  const box = size === 'lg' ? 'h-6.5 w-9 rounded-sm' : 'h-5 w-6.5 rounded-sm'
  const tone = onDark ? 'bg-bg/10 text-bg/65' : 'bg-ink/10 text-ink/50'
  return (
    <span aria-hidden="true" className={`flex items-center justify-center transition-colors ${box} ${tone} ${className}`}>
      ▶
    </span>
  )
}
