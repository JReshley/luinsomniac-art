// Row of toggle chips that filters the Museum by category. Only one is active
// at a time; aria-pressed tells screen readers which one.

export default function FilterBar({ options, active, onChange }) {
  return (
    <div role="group" aria-label="Filter by discipline" className="flex flex-wrap gap-1 border-b border-ink/10 pb-2.5">
      {options.map((option) => {
        const isActive = option === active
        return (
          <button
            key={option}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option)}
            className={`cursor-pointer rounded-full border px-2 py-1 font-mono text-small uppercase transition-[color,background-color,border-color,scale] ease-spring motion-safe:active:scale-90 ${
              isActive ? 'border-ink bg-ink text-surface' : 'border-ink/10 bg-surface text-ink hover:border-ink/25'
            }`}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}
