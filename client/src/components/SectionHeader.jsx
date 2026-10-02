import DisplayTitle from './DisplayTitle.jsx'

// Title for a page section, with an optional description and action on the right.
// Pass onDark when the section sits on a navy or blue band.

export default function SectionHeader({ title, description, action, onDark = false }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div className="flex flex-col gap-1">
        <DisplayTitle as="h2" text={title} className={`font-display text-heading ${onDark ? 'text-bg' : 'text-ink'}`} />
        {description && <p className={onDark ? 'text-bg/65' : 'text-ink/65'}>{description}</p>}
      </div>
      {action}
    </div>
  )
}
